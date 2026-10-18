import { ArduinoHardwareConfig } from '../types/simhub';

export function generateSimHubArduinoSketch(config: ArduinoHardwareConfig): string {
  const clockConstant = config.mcpClock === '16MHz' ? 'MCP_16MHZ' : 'MCP_8MHZ';
  const baudConstant = config.canSpeed === '100kbps' ? 'CAN_100KBPS' : 'CAN_500KBPS';

  return `/*
 * ==============================================================================
 * BMW E90 (3-Series) Instrument Cluster <--> SimHub Serial Bridge
 * Hardware: Arduino Mega 2560 + MCP2515 CAN Bus Shield
 *
 * Designed specifically for SimHub Custom Serial Device
 * Compatible with: Assetto Corsa, Assetto Corsa Competizione, Forza Horizon / Motorsport,
 *                  BeamNG.drive, iRacing, Euro Truck Simulator 2, Dirt Rally 2.0, F1 23/24
 *
 * Supported Cluster Features:
 *   - Speedometer needle (0 - 260 km/h or 0 - 160 MPH) [CAN 0x1A0]
 *   - Tachometer RPM needle (0 - 8000 RPM) [CAN 0x0AA]
 *   - Fuel Consumption / MPG needle [CAN 0x349]
 *   - Headlights: Low Beam & High Beam (blue lamp) [CAN 0x21A]
 *   - Fog Lamps: Front Fog (green) & Rear Fog (amber) [CAN 0x21A]
 *   - Check Engine Light (MIL / Overheat / Fault) [CAN 0x592]
 *   - ABS & DTC / Traction Control warnings [CAN 0x1B4]
 *   - Handbrake / Parking brake light [CAN 0x1B4]
 *   - Turn Signals (Left / Right / Hazards) [CAN 0x21A]
 *   - Coolant & Oil Temperature [CAN 0x34A]
 *   - Ignition Keepalive / Wakeup (Clamp 15) [CAN 0x130]
 *   - Amber Night Backlight Dimmer [CAN 0x202]
 *
 * ARDUINO MEGA 2560 SPI CONNECTIONS:
 *   - MOSI : Pin 51 (or ICSP Pin 4)
 *   - MISO : Pin 50 (or ICSP Pin 1)
 *   - SCK  : Pin 52 (or ICSP Pin 3)
 *   - CS   : Pin ${config.csPin}
 *   - VCC  : 5V  |  GND : Common Ground with 12V PSU and Kombi
 *
 * SIMHUB SERIAL PACKET FORMAT:
 *   <S;speed;rpm;gear;mpg;waterTemp;oilTemp;low;high;fogF;fogR;cel;abs;tc;brake;turnL;turnR;ign>
 * ==============================================================================
 */

#include <SPI.h>
#include <mcp_can.h>

// ------------------------------------------------------------------------------
// Hardware Pin Definitions
// ------------------------------------------------------------------------------
const int CAN_CS_PIN = ${config.csPin}; // Chip Select Pin on Arduino Mega
MCP_CAN CAN0(CAN_CS_PIN);

// ------------------------------------------------------------------------------
// Telemetry Variables Received from SimHub
// ------------------------------------------------------------------------------
float  simSpeed       = 0.0;    // km/h
float  simRpm         = 0.0;    // RPM
float  simMpg         = 30.0;   // Instantaneous MPG or L/100km
int    simWaterTemp   = 90;     // °C
int    simOilTemp     = 95;     // °C
char   simGear[4]     = "N";    // Current Gear (R, N, 1, 2, 3...)

bool   simLowBeam     = false;
bool   simHighBeam    = false;
bool   simFogFront    = false;
bool   simFogRear     = false;
bool   simCheckEngine = false;  // Overheat, water temp alarm, or engine damage
bool   simAbs         = false;  // ABS active / warning
bool   simTc          = false;  // Traction control active (DTC)
bool   simHandbrake   = false;  // Parking brake
bool   simTurnL       = false;  // Left Turn Signal
bool   simTurnR       = false;  // Right Turn Signal
byte   simIgnition    = 2;      // 0=Sleep, 1=Acc, 2=Ignition ON / Run

int    backlightLevel = 220;    // Amber backlight intensity (0-255)

// ------------------------------------------------------------------------------
// Non-blocking Timing Loops
// ------------------------------------------------------------------------------
unsigned long lastTime130  = 0;   // 100ms - Terminal 15/R Keepalive
unsigned long lastTime0AA  = 0;   // 20ms  - Engine RPM
unsigned long lastTime1A0  = 0;   // 20ms  - Vehicle Speed
unsigned long lastTime21A  = 0;   // 100ms - Lights & Turn Signals
unsigned long lastTime349  = 0;   // 100ms - Fuel Economy (MPG)
unsigned long lastTime592  = 0;   // 200ms - Check Engine Light (MIL)
unsigned long lastTime1B4  = 0;   // 50ms  - Handbrake, ABS & DTC
unsigned long lastTime202  = 0;   // 200ms - Backlight Dimmer
unsigned long lastTime34A  = 0;   // 100ms - Coolant & Oil Temp
unsigned long lastSimRxTime = 0;  // Watchdog timer for SimHub data stream

// ------------------------------------------------------------------------------
// Serial Parser Buffer (Framed by '<' and '>')
// ------------------------------------------------------------------------------
const byte SERIAL_BUF_SIZE = 128;
char serialBuffer[SERIAL_BUF_SIZE];
byte bufferIndex = 0;
bool receivingPacket = false;

// ------------------------------------------------------------------------------
// Setup
// ------------------------------------------------------------------------------
void setup() {
  // SimHub High Speed Serial Port
  Serial.begin(${config.baudRate});
  while (!Serial && millis() < 3000);

  Serial.println(F("BMW_E90_SIMHUB_BRIDGE_START"));

  // Initialize MCP2515 CAN Controller
  // Speed: ${config.canSpeed}, Crystal: ${config.mcpClock}
  if (CAN0.begin(MCP_ANY, ${baudConstant}, ${clockConstant}) == CAN_OK) {
    Serial.println(F("CAN_INIT_OK"));
  } else {
    Serial.println(F("CAN_INIT_FAIL - Check Mega SPI Pins (50 MISO, 51 MOSI, 52 SCK, CS)"));
    while (1) {
      delay(1000);
    }
  }

  CAN0.setMode(MCP_NORMAL);
  Serial.println(F("READY_FOR_TELEMETRY"));
  lastSimRxTime = millis();
}

// ------------------------------------------------------------------------------
// Main Execution Loop
// ------------------------------------------------------------------------------
void loop() {
  unsigned long currentMillis = millis();

  // 1. Ingest SimHub Serial Packets
  readSimHubSerial();

  // 2. Watchdog: If no SimHub packets received for > 3.0 seconds (e.g. game paused/closed)
  // gently drop needles to idle so the cluster doesn't stay stuck at high speed
  if (currentMillis - lastSimRxTime > 3000) {
    if (simRpm > 0) simRpm = 0;
    if (simSpeed > 0) simSpeed = 0;
  }

  // --------------------------------------------------------------------------
  // CAN 0x130 - CAS Terminal Status (Clamp 15 Ignition Keepalive) - Every 100ms
  // Mandatory: Without this, the E90 cluster goes to sleep in 8 seconds!
  // --------------------------------------------------------------------------
  if (currentMillis - lastTime130 >= 100) {
    lastTime130 = currentMillis;

    byte frame130[5];
    if (simIgnition >= 2) {
      frame130[0] = 0x45; // Clamp 15 (Ignition ON / Engine Run)
      frame130[1] = 0x40; // Key inserted in dash slot
      frame130[2] = 0x21; // 15WUP Wakeup line active
      frame130[3] = 0x8F; // Starter interlock OK
      frame130[4] = 0x00;
    } else if (simIgnition == 1) {
      frame130[0] = 0x41; // Clamp R (Radio / Accessory)
      frame130[1] = 0x40;
      frame130[2] = 0x21;
      frame130[3] = 0x8F;
      frame130[4] = 0x00;
    } else {
      frame130[0] = 0x00; // Sleep / Key out
      frame130[1] = 0x00;
      frame130[2] = 0x00;
      frame130[3] = 0x8F;
      frame130[4] = 0x00;
    }
    CAN0.sendMsgBuf(0x130, 0, 5, frame130);
  }

  // If cluster is set to sleep, do not spam gauge movements
  if (simIgnition == 0) return;

  // --------------------------------------------------------------------------
  // CAN 0x0AA - DME1 Engine RPM & Throttle - Every 20ms (50 Hz)
  // Formula: Raw = RPM * 4  =>  RPM = Raw / 4
  // --------------------------------------------------------------------------
  if (currentMillis - lastTime0AA >= 20) {
    lastTime0AA = currentMillis;

    unsigned int rawRpm = (unsigned int)(constrain(simRpm, 0.0, 8000.0) * 4.0);
    byte throttle = (byte)constrain(map((long)simRpm, 0, 8000, 0, 254), 0, 254);

    byte frame0AA[8] = {
      0xFE,                         // Torque status
      throttle,                     // Throttle pedal position
      0x00,                         // Clutch & brake flags
      0x00,                         // Idle control
      (byte)(rawRpm & 0xFF),        // RPM LSB
      (byte)((rawRpm >> 8) & 0xFF), // RPM MSB
      0x00,                         // Rolling counter
      0x80                          // Checksum
    };
    CAN0.sendMsgBuf(0x0AA, 0, 8, frame0AA);
  }

  // --------------------------------------------------------------------------
  // CAN 0x1A0 - Radgeschwindigkeiten (Speedometer Needle) - Every 20ms (50 Hz)
  // Formula: Raw = Speed_kmh * 16.0
  // --------------------------------------------------------------------------
  if (currentMillis - lastTime1A0 >= 20) {
    lastTime1A0 = currentMillis;

    unsigned int rawSpeed = (unsigned int)(constrain(simSpeed, 0.0, 260.0) * 16.0);
    byte spdLsb = (byte)(rawSpeed & 0xFF);
    byte spdMsb = (byte)((rawSpeed >> 8) & 0xFF);

    byte frame1A0[8] = {
      spdLsb, spdMsb, // Rear Left Wheel Speed
      spdLsb, spdMsb, // Rear Right Wheel Speed
      spdLsb, spdMsb, // Front Left Wheel Speed
      spdLsb, spdMsb  // Front Right Wheel Speed
    };
    CAN0.sendMsgBuf(0x1A0, 0, 8, frame1A0);
  }

  // --------------------------------------------------------------------------
  // CAN 0x21A - Lampenstatus (Headlights, High Beams, Fogs, Turn Signals) - 100ms
  // --------------------------------------------------------------------------
  if (currentMillis - lastTime21A >= 100) {
    lastTime21A = currentMillis;

    byte lightByte = 0x00;
    if (simLowBeam)   lightByte |= 0x01 | 0x40; // Low beam + side markers
    if (simHighBeam)  lightByte |= 0x02;        // High beam (Blue telltale)
    if (simFogFront)  lightByte |= 0x04;        // Front Fog (Green telltale)
    if (simFogRear)   lightByte |= 0x08;        // Rear Fog (Amber telltale)
    if (simTurnL)     lightByte |= 0x10;        // Left Turn Signal Arrow
    if (simTurnR)     lightByte |= 0x20;        // Right Turn Signal Arrow

    byte frame21A[3] = {
      lightByte,
      0x00,
      (byte)((simTurnL || simTurnR) ? 0x01 : 0x00)
    };
    CAN0.sendMsgBuf(0x21A, 0, 3, frame21A);
  }

  // --------------------------------------------------------------------------
  // CAN 0x349 - Instantaneous Fuel Economy (MPG Needle) - Every 100ms
  // --------------------------------------------------------------------------
  if (currentMillis - lastTime349 >= 100) {
    lastTime349 = currentMillis;

    unsigned int fuelRate = (unsigned int)(constrain(simMpg, 0.0, 50.0) * 120.0);
    byte frame349[5] = {
      (byte)(fuelRate & 0xFF),
      (byte)((fuelRate >> 8) & 0xFF),
      0x50, 0x01,
      0x00
    };
    CAN0.sendMsgBuf(0x349, 0, 5, frame349);
  }

  // --------------------------------------------------------------------------
  // CAN 0x592 - DME Check Engine Light (MIL / Fault / Overheat) - Every 200ms
  // --------------------------------------------------------------------------
  if (currentMillis - lastTime592 >= 200) {
    lastTime592 = currentMillis;

    byte frame592[8] = {
      (byte)(simCheckEngine ? 0x01 : 0x00), // 0x01 = Check Engine ON, 0x00 = OFF
      0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    };
    CAN0.sendMsgBuf(0x592, 0, 8, frame592);
  }

  // --------------------------------------------------------------------------
  // CAN 0x1B4 - DSC Status (Handbrake, ABS, DTC) - Every 50ms
  // --------------------------------------------------------------------------
  if (currentMillis - lastTime1B4 >= 50) {
    lastTime1B4 = currentMillis;

    byte dscByte = 0x00;
    if (simHandbrake) dscByte |= 0x01; // Red Brake (!)
    if (simAbs)       dscByte |= 0x02; // Amber ABS
    if (simTc)        dscByte |= 0x04; // Amber DTC Triangle

    byte frame1B4[8] = {
      dscByte,
      (byte)(simTc ? 0x02 : 0x00),
      (byte)(simAbs ? 0x01 : 0x00),
      0x00, 0x00, 0x00, 0x00, 0x00
    };
    CAN0.sendMsgBuf(0x1B4, 0, 8, frame1B4);
  }

  // --------------------------------------------------------------------------
  // CAN 0x202 - Kombi Amber Backlight Dimming - Every 200ms
  // --------------------------------------------------------------------------
  if (currentMillis - lastTime202 >= 200) {
    lastTime202 = currentMillis;

    // Automatically boost backlight if headlights are on
    int activeDim = simLowBeam ? 250 : backlightLevel;
    byte frame202[3] = {
      0xFD,
      (byte)constrain(activeDim, 0, 255),
      0x00
    };
    CAN0.sendMsgBuf(0x202, 0, 3, frame202);
  }

  // --------------------------------------------------------------------------
  // CAN 0x34A - Engine Coolant & Oil Temperature - Every 100ms
  // Formula: Byte = Temp_C + 48
  // --------------------------------------------------------------------------
  if (currentMillis - lastTime34A >= 100) {
    lastTime34A = currentMillis;

    byte rawWater = (byte)constrain(simWaterTemp + 48, 0, 255);
    byte rawOil   = (byte)constrain(simOilTemp + 48, 0, 255);
    byte frame34A[8] = {
      rawWater,       // Coolant Temp
      rawOil,         // Oil Temp
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    };
    CAN0.sendMsgBuf(0x34A, 0, 8, frame34A);
  }
}

// ------------------------------------------------------------------------------
// Robust Framed Serial Reader for SimHub
// Format: <S;speed;rpm;gear;mpg;waterTemp;oilTemp;low;high;fogF;fogR;cel;abs;tc;brake;turnL;turnR;ign>
// ------------------------------------------------------------------------------
void readSimHubSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '<') {
      // Packet start marker detected
      bufferIndex = 0;
      receivingPacket = true;
    } else if (c == '>' && receivingPacket) {
      // Packet end marker detected
      serialBuffer[bufferIndex] = '\\0';
      receivingPacket = false;
      parseSimHubPacket(serialBuffer);
      lastSimRxTime = millis();
    } else if (receivingPacket) {
      if (bufferIndex < SERIAL_BUF_SIZE - 1) {
        serialBuffer[bufferIndex++] = c;
      } else {
        // Buffer overflow protection: reset
        bufferIndex = 0;
        receivingPacket = false;
      }
    }
  }
}

// ------------------------------------------------------------------------------
// Tokenizer / Parser for Telemetry String
// ------------------------------------------------------------------------------
void parseSimHubPacket(char* buf) {
  // Check header 'S' (SimHub)
  if (buf[0] != 'S') return;

  char* token = strtok(buf, ";"); // Skip 'S'
  int tokenIndex = 0;

  while ((token = strtok(NULL, ";")) != NULL) {
    switch (tokenIndex) {
      case 0:  simSpeed       = atof(token); break;
      case 1:  simRpm         = atof(token); break;
      case 2:  strncpy(simGear, token, 3);   break;
      case 3:  simMpg         = atof(token); break;
      case 4:  simWaterTemp   = atoi(token); break;
      case 5:  simOilTemp     = atoi(token); break;
      case 6:  simLowBeam     = (atoi(token) != 0); break;
      case 7:  simHighBeam    = (atoi(token) != 0); break;
      case 8:  simFogFront    = (atoi(token) != 0); break;
      case 9:  simFogRear     = (atoi(token) != 0); break;
      case 10: simCheckEngine = (atoi(token) != 0); break;
      case 11: simAbs         = (atoi(token) != 0); break;
      case 12: simTc          = (atoi(token) != 0); break;
      case 13: simHandbrake   = (atoi(token) != 0); break;
      case 14: simTurnL       = (atoi(token) != 0); break;
      case 15: simTurnR       = (atoi(token) != 0); break;
      case 16: simIgnition    = (byte)atoi(token); break;
    }
    tokenIndex++;
  }
}
`;
}

export function generateSimHubProfileJson(config: ArduinoHardwareConfig): string {
  const profile = {
    DeviceName: "BMW E90 Cluster Bridge (Mega 2560)",
    PortName: "COM3",
    BaudRate: config.baudRate,
    ConnectionMessage: "<S;0;0;N;25;90;90;0;0;0;0;0;0;0;1;0;0;2>\\n",
    DisconnectionMessage: "<S;0;0;N;0;0;0;0;0;0;0;0;0;0;0;0;0;0>\\n",
    UpdateInterval: 20,
    UpdateMessageNCalc: `format('<S;{0};{1};{2};{3};{4};{5};{6};{7};{8};{9};{10};{11};{12};{13};{14};{15};{16}>\\n',
  round([SpeedKmh], 1),
  round([Rpms]),
  isnull([Gear], 'N'),
  round(isnull([Fuel_LitersPer100Km], 28), 1),
  round(isnull([EngineWaterTemperature], 90)),
  round(isnull([OilTemperature], 95)),
  [GameRawData.Lights_LowBeam] ? 1 : 0,
  [GameRawData.Lights_HighBeam] ? 1 : 0,
  [GameRawData.Lights_FogFront] ? 1 : 0,
  [GameRawData.Lights_FogRear] ? 1 : 0,
  ([EngineWaterTemperatureWarning] || [OilPressureWarning] || [EngineIgnitionOn] == 0) ? 1 : 0,
  [ABSActive] ? 1 : 0,
  [TCActive] ? 1 : 0,
  [Handbrake] ? 1 : 0,
  [TurnIndicatorLeft] ? 1 : 0,
  [TurnIndicatorRight] ? 1 : 0,
  [EngineIgnitionOn] ? 2 : 1
)`
  };
  return JSON.stringify(profile, null, 2);
}

/*
 * ==============================================================================
 * Aston Martin DB9 & V8 Vantage (Volvo PAG Platform) <--> SimHub Serial Bridge
 * Hardware: Arduino Mega 2560 + Seeed Studio CAN-BUS Shield (CS Pin 10)
 *
 * Vehicle Platform Details:
 *   - Vehicle Model: Aston Martin DB9 / V8 Vantage / DBS (2004 - 2016)
 *   - Platform Architecture: Ford PAG / Volvo P1/P2 Visteon Electronics
 *   - Central Electronic Module (CEM): Volvo P1-derived CEM architecture
 *   - Driver Information Module (DIM): Dual digital OLED/dot-matrix screens
 *   - Tachometer Signature: Counter-Clockwise (Anti-Clockwise) sweep!
 *   - CAN Bus Protocol: Volvo / Ford PAG Standard 11-bit & 29-bit CAN
 *   - Interior CAN Speed: 125 kbps (MS-CAN) or 500 kbps (HS-CAN)
 *
 * HARDWARE WIRING (Seeed CAN-BUS Shield on Arduino Mega 2560):
 *   - CS Pin : Pin 10
 *   - SPI    : Connects via 6-pin ICSP header (MISO 50, MOSI 51, SCK 52)
 *   - Crystal: 16 MHz (Seeed shield uses 16MHz)
 *
 * ASTON MARTIN DB9 / VOLVO DIM 16-PIN CONNECTOR:
 *   - Pin 1  : +12V Constant Battery Power (VBAT / KL30)
 *   - Pin 16 : Ground (GND / KL31)
 *   - Pin 10 : CAN High (CAN_H) -> Connect to Seeed Shield CANH
 *   - Pin 11 : CAN Low (CAN_L)  -> Connect to Seeed Shield CANL
 *
 * SIMHUB SERIAL PACKET FORMAT:
 *   <S;speed;rpm;gear;mpg;waterTemp;oilTemp;low;high;fogF;fogR;cel;abs;tc;brake;turnL;turnR;ign>
 * ==============================================================================
 */

#include <SPI.h>
#include <mcp_can.h>

// ------------------------------------------------------------------------------
// Hardware Pin Definitions for Seeed Studio CAN-BUS Shield
// ------------------------------------------------------------------------------
const int CAN_CS_PIN = 10; // Seeed Shield default CS pin 10
MCP_CAN CAN0(CAN_CS_PIN);

// ------------------------------------------------------------------------------
// Telemetry Variables Received from SimHub
// ------------------------------------------------------------------------------
float  simSpeed       = 0.0;    // km/h (0 - 330)
float  simRpm         = 0.0;    // RPM (0 - 8000, sweeps counter-clockwise!)
float  simMpg         = 24.0;   // Fuel economy / instant consumption
int    simWaterTemp   = 90;     // °C
int    simOilTemp     = 95;     // °C
char   simGear[4]     = "N";    // Current Gear (P, R, N, D, 1, 2, 3...)

bool   simLowBeam     = false;
bool   simHighBeam    = false;
bool   simFogFront    = false;
bool   simFogRear     = false;
bool   simCheckEngine = false;  // Overheat, water temp alarm, or engine damage
bool   simAbs         = false;  // ABS active / warning
bool   simTc          = false;  // Traction control active (ESP / DSC)
bool   simHandbrake   = false;  // Parking brake
bool   simTurnL       = false;  // Left Turn Signal
bool   simTurnR       = false;  // Right Turn Signal
byte   simIgnition    = 2;      // 0=Sleep, 1=Acc, 2=Ignition ON ("Power, Beauty, Soul")

int    backlightLevel = 240;    // Pure white/ice blue LED dial backlight

// ------------------------------------------------------------------------------
// Timing Loops (Volvo / Aston Martin CAN Transmit Schedules)
// ------------------------------------------------------------------------------
unsigned long lastTimeCEM    = 0;   // 100ms - CEM Ignition State & Wakeup
unsigned long lastTimeRPM    = 0;   // 20ms  - Engine RPM (CAN ID 0x201)
unsigned long lastTimeSpeed  = 0;   // 20ms  - Vehicle Speed (CAN ID 0x420)
unsigned long lastTimeLights = 0;   // 100ms - Lighting & Turn Signals (CAN ID 0x212)
unsigned long lastTimeBrakes = 0;   // 50ms  - Handbrake, ABS & DSC (CAN ID 0x320)
unsigned long lastTimeTemps  = 0;   // 100ms - Coolant & Oil Temp (CAN ID 0x410)
unsigned long lastSimRxTime  = 0;   // Watchdog timer for SimHub data stream

// ------------------------------------------------------------------------------
// Serial Parser Buffer
// ------------------------------------------------------------------------------
const byte SERIAL_BUF_SIZE = 128;
char serialBuffer[SERIAL_BUF_SIZE];
byte bufferIndex = 0;
bool receivingPacket = false;

// ------------------------------------------------------------------------------
// Setup Routine
// ------------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);

  Serial.println(F("============================================="));
  Serial.println(F("ASTON MARTIN DB9 (VOLVO PAG) CLUSTER BRIDGE"));
  Serial.println(F("Target: Arduino Mega + Seeed CAN Shield (CS: 10)"));
  Serial.println(F("Baud: 125 kbps (MS-CAN) / 16 MHz Crystal"));
  Serial.println(F("============================================="));

  // Initialize MCP2515 CAN Controller
  // Aston Martin / Volvo interior cluster connects via MS-CAN (125 kbps)
  // or HS-CAN (500 kbps). Seeed Studio shield uses a 16MHz crystal (MCP_16MHZ).
  if (CAN0.begin(MCP_ANY, CAN_125KBPS, MCP_16MHZ) == CAN_OK) {
    Serial.println(F("SEEED CAN-BUS SHIELD INITIALIZED OK (125 KBPS)!"));
  } else {
    Serial.println(F("CAN INIT FAILED!"));
    Serial.println(F("Verify Seeed shield is firmly plugged into Mega ICSP header."));
    while (1) delay(1000);
  }

  CAN0.setMode(MCP_NORMAL);
  Serial.println(F("READY_FOR_SIMHUB_TELEMETRY"));
  lastSimRxTime = millis();
}

// ------------------------------------------------------------------------------
// Main Execution Loop
// ------------------------------------------------------------------------------
void loop() {
  unsigned long currentMillis = millis();

  // 1. Ingest SimHub Serial Packets
  readSimHubSerial();

  // 2. Watchdog: If SimHub pauses or disconnects for > 3.0s, return needles to 0
  if (currentMillis - lastSimRxTime > 3000) {
    if (simRpm > 0) simRpm = 0;
    if (simSpeed > 0) simSpeed = 0;
  }

  // --------------------------------------------------------------------------
  // 1. CAN ID 0x020 - Volvo/Aston Martin CEM Ignition & Wakeup [100ms]
  // Drives the startup sequence and "POWER, BEAUTY, SOUL" splash on DIM OLED!
  // --------------------------------------------------------------------------
  if (currentMillis - lastTimeCEM >= 100) {
    lastTimeCEM = currentMillis;

    byte frameCEM[8] = { 0 };
    if (simIgnition >= 2) {
      frameCEM[0] = 0x03; // Ignition Mode: RUN (Position II)
      frameCEM[1] = 0x48; // Engine running flag
      frameCEM[2] = 0x01; // Key in ignition slot
      frameCEM[3] = 0x00;
      frameCEM[4] = 0x00;
      frameCEM[5] = 0x00;
      frameCEM[6] = 0x00;
      frameCEM[7] = 0x00;
    } else if (simIgnition == 1) {
      frameCEM[0] = 0x01; // Position I (Accessory)
      frameCEM[1] = 0x00;
      frameCEM[2] = 0x01;
    } else {
      frameCEM[0] = 0x00; // Position 0 (Sleep / Key out)
    }
    CAN0.sendMsgBuf(0x020, 0, 8, frameCEM);
  }

  if (simIgnition == 0) return; // Sleep mode

  // --------------------------------------------------------------------------
  // 2. CAN ID 0x201 - Engine RPM & Throttle (ECM / PCM) [20ms - 50 Hz]
  // On the Aston Martin DB9, this drives the COUNTER-CLOCKWISE tachometer!
  // Formula: Raw = RPM * 4.0  =>  RPM = Raw / 4
  // --------------------------------------------------------------------------
  if (currentMillis - lastTimeRPM >= 20) {
    lastTimeRPM = currentMillis;

    unsigned int rawRpm = (unsigned int)(constrain(simRpm, 0.0, 8000.0) * 4.0);
    byte throttle = (byte)constrain(map((long)simRpm, 0, 8000, 0, 254), 0, 254);

    byte frame201[8] = {
      (byte)((rawRpm >> 8) & 0xFF), // Byte 0: RPM MSB
      (byte)(rawRpm & 0xFF),        // Byte 1: RPM LSB
      throttle,                     // Byte 2: Throttle position
      0x00,                         // Byte 3: Torque status
      0x00,                         // Byte 4: Engine status
      (byte)(simCheckEngine ? 0x01 : 0x00), // Byte 5: Check Engine Light (MIL)
      0x00,                         // Byte 6: Rolling counter
      0x80                          // Byte 7: Checksum
    };
    CAN0.sendMsgBuf(0x201, 0, 8, frame201);
  }

  // --------------------------------------------------------------------------
  // 3. CAN ID 0x420 - Vehicle Speed & Odometer (ABS / BCM) [20ms - 50 Hz]
  // Formula: Raw = Speed_kmh * 100.0
  // --------------------------------------------------------------------------
  if (currentMillis - lastTimeSpeed >= 20) {
    lastTimeSpeed = currentMillis;

    unsigned int rawSpeed = (unsigned int)(constrain(simSpeed, 0.0, 330.0) * 100.0);

    byte frame420[8] = {
      (byte)((rawSpeed >> 8) & 0xFF), // Speed MSB
      (byte)(rawSpeed & 0xFF),        // Speed LSB
      0x00, 0x00,                     // Distance / Pulse
      0x00, 0x00, 0x00, 0x00
    };
    CAN0.sendMsgBuf(0x420, 0, 8, frame420);
  }

  // --------------------------------------------------------------------------
  // 4. CAN ID 0x212 - Lighting & Telltales (CEM / Switch Module) [100ms]
  // Headlights, High Beam, Front/Rear Fogs, and Turn Signal Arrows
  // --------------------------------------------------------------------------
  if (currentMillis - lastTimeLights >= 100) {
    lastTimeLights = currentMillis;

    byte lightByte1 = 0x00;
    if (simLowBeam)   lightByte1 |= 0x01 | 0x04; // Low beam + Position lamps
    if (simHighBeam)  lightByte1 |= 0x02;        // High beam (Blue telltale)
    if (simFogFront)  lightByte1 |= 0x10;        // Front Fog Lamps (Green)
    if (simFogRear)   lightByte1 |= 0x20;        // Rear Fog Lamp (Amber)

    byte lightByte2 = 0x00;
    if (simTurnL) lightByte2 |= 0x01; // Left Blinker
    if (simTurnR) lightByte2 |= 0x02; // Right Blinker

    byte frame212[8] = {
      lightByte1,
      lightByte2,
      (byte)constrain(backlightLevel, 0, 255), // Dial illumination intensity
      0x00, 0x00, 0x00, 0x00, 0x00
    };
    CAN0.sendMsgBuf(0x212, 0, 8, frame212);
  }

  // --------------------------------------------------------------------------
  // 5. CAN ID 0x320 - Brake & Stability Control (ABS, DSC, Handbrake) [50ms]
  // --------------------------------------------------------------------------
  if (currentMillis - lastTimeBrakes >= 50) {
    lastTimeBrakes = currentMillis;

    byte brakeByte = 0x00;
    if (simHandbrake) brakeByte |= 0x01; // Red Brake (!)
    if (simAbs)       brakeByte |= 0x02; // Amber ABS
    if (simTc)        brakeByte |= 0x04; // Amber DSC / Traction

    byte frame320[8] = {
      brakeByte,
      (byte)(simTc ? 0x02 : 0x00),
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    };
    CAN0.sendMsgBuf(0x320, 0, 8, frame320);
  }

  // --------------------------------------------------------------------------
  // 6. CAN ID 0x410 - Engine Temperatures & Fuel Level [100ms]
  // --------------------------------------------------------------------------
  if (currentMillis - lastTimeTemps >= 100) {
    lastTimeTemps = currentMillis;

    byte rawWater = (byte)constrain(simWaterTemp + 40, 0, 255);
    byte rawOil   = (byte)constrain(simOilTemp + 40, 0, 255);

    byte frame410[8] = {
      rawWater, // Coolant Temp
      rawOil,   // Oil Temp
      0x50,     // Fuel Level (50%)
      0x00, 0x00, 0x00, 0x00, 0x00
    };
    CAN0.sendMsgBuf(0x410, 0, 8, frame410);
  }
}

// ------------------------------------------------------------------------------
// Framed Serial Reader for SimHub
// ------------------------------------------------------------------------------
void readSimHubSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '<') {
      bufferIndex = 0;
      receivingPacket = true;
    } else if (c == '>' && receivingPacket) {
      serialBuffer[bufferIndex] = '\0';
      receivingPacket = false;
      parseSimHubPacket(serialBuffer);
      lastSimRxTime = millis();
    } else if (receivingPacket) {
      if (bufferIndex < SERIAL_BUF_SIZE - 1) {
        serialBuffer[bufferIndex++] = c;
      } else {
        bufferIndex = 0;
        receivingPacket = false;
      }
    }
  }
}

// ------------------------------------------------------------------------------
// Tokenizer / Parser
// ------------------------------------------------------------------------------
void parseSimHubPacket(char* buf) {
  if (buf[0] != 'S') return;

  char* token = strtok(buf, ";");
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

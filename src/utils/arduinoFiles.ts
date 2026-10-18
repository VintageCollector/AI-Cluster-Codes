/**
 * Aston Martin DB9 CAN Definitions Header (.h)
 * 100% Arduino IDE Native Header File
 */
export const CAN_DEFS_HEADER_CODE = `/*
 * ==============================================================================
 * Aston Martin DB9 / V8 Vantage (Volvo PAG Platform) CAN Bus Definitions
 * Header File: Aston_Martin_DB9_CAN_Defs.h
 * Target: Arduino Mega 2560 + Seeed Studio CAN-BUS Shield (CS Pin 10)
 * ==============================================================================
 */

#ifndef ASTON_MARTIN_DB9_CAN_DEFS_H
#define ASTON_MARTIN_DB9_CAN_DEFS_H

// ------------------------------------------------------------------------------
// CAN Arbitration IDs (Volvo P1/P2 & Ford PAG Architecture)
// ------------------------------------------------------------------------------
#define CAN_ID_CEM_IGNITION      0x020  // Central Electronic Module (Power Mode & Wakeup)
#define CAN_ID_ECM_ENGINE        0x201  // Engine Control Module (RPM & Throttle)
#define CAN_ID_ABS_SPEED         0x420  // Brake / ABS Module (Vehicle Speed & Distance)
#define CAN_ID_LIGHTS_STATUS     0x212  // Switch Module / CEM (Lighting & Blinkers)
#define CAN_ID_BRAKE_STABILITY   0x320  // Dynamic Stability Control (ABS, DSC, Handbrake)
#define CAN_ID_TEMPERATURES      0x410  // Engine Temps (Coolant, Oil & Fuel Level)

// ------------------------------------------------------------------------------
// Lighting Bitmasks (CAN ID 0x212 - Byte 0)
// ------------------------------------------------------------------------------
#define AM_LIGHT_LOW_BEAM        0x01   // Low Beam Headlights
#define AM_LIGHT_HIGH_BEAM       0x02   // High Beam (Blue Tell-tale)
#define AM_LIGHT_POSITION        0x04   // Side Marker / Position Lamps
#define AM_LIGHT_FOG_FRONT       0x10   // Front Fog Lamps (Green Tell-tale)
#define AM_LIGHT_FOG_REAR        0x20   // Rear Fog Lamp (Amber Tell-tale)

// ------------------------------------------------------------------------------
// Turn Indicators (CAN ID 0x212 - Byte 1)
// ------------------------------------------------------------------------------
#define AM_TURN_LEFT             0x01   // Left Turn Signal Arrow
#define AM_TURN_RIGHT            0x02   // Right Turn Signal Arrow

// ------------------------------------------------------------------------------
// Stability & Brakes (CAN ID 0x320 - Byte 0)
// ------------------------------------------------------------------------------
#define AM_BRAKE_HANDBRAKE       0x01   // Handbrake / Parking Brake (!)
#define AM_BRAKE_ABS_FAULT       0x02   // Anti-lock Braking System Warning
#define AM_BRAKE_DSC_ACTIVE      0x04   // Dynamic Stability Control Warning

#endif // ASTON_MARTIN_DB9_CAN_DEFS_H
`;

/**
 * Aston Martin DB9 SimHub Configuration Header (.h)
 * 100% Arduino IDE Native Header File
 */
export const SIMHUB_CONFIG_HEADER_CODE = `/*
 * ==============================================================================
 * Aston Martin DB9 / V8 Vantage (Volvo PAG Platform) SimHub Configuration
 * Header File: Aston_Martin_DB9_SimHub_Config.h
 * Target: Arduino Mega 2560 + Seeed Studio CAN-BUS Shield (CS Pin 10)
 * Format: Standard Arduino C/C++ Header (.h) - 100% Arduino IDE Compatible
 * ==============================================================================
 */

#ifndef ASTON_MARTIN_DB9_SIMHUB_CONFIG_H
#define ASTON_MARTIN_DB9_SIMHUB_CONFIG_H

// ------------------------------------------------------------------------------
// Serial Communication Parameters
// ------------------------------------------------------------------------------
#define SIMHUB_SERIAL_BAUD_RATE      115200
#define SIMHUB_PACKET_START_CHAR     '<'
#define SIMHUB_PACKET_COMMAND_CHAR   'S'
#define SIMHUB_PACKET_DELIMITER      ';'
#define SIMHUB_PACKET_END_CHAR       '>'
#define SIMHUB_PACKET_FIELD_COUNT    17
#define SIMHUB_RECOMMENDED_INTERVAL_MS 20    // 50 Hz refresh rate

// ------------------------------------------------------------------------------
// SimHub Connection & Disconnection Strings
// Copy these directly into SimHub "Custom Serial device" settings:
// ------------------------------------------------------------------------------
#define SIMHUB_CONNECT_MESSAGE       "<S;0;0;N;24;90;95;0;0;0;0;0;0;0;1;0;0;2>\\n"
#define SIMHUB_DISCONNECT_MESSAGE    "<S;0;0;N;0;0;0;0;0;0;0;0;0;0;0;0;0;0>\\n"

// ------------------------------------------------------------------------------
// SimHub NCalc Formula (Paste into "Update message" -> "NCalc" in SimHub)
// ------------------------------------------------------------------------------
/*
format('<S;{0};{1};{2};{3};{4};{5};{6};{7};{8};{9};{10};{11};{12};{13};{14};{15};{16}>\\n',
  round([SpeedKmh], 1),
  round([Rpms]),
  isnull([Gear], 'N'),
  round(isnull([Fuel_LitersPer100Km], 24), 1),
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
)
*/

// ------------------------------------------------------------------------------
// Telemetry Field Index Map (Received in serial frame)
// ------------------------------------------------------------------------------
enum SimHubFieldIndex {
  FIELD_SPEED_KMH        = 0,   // Speed in km/h (Aston Martin DB9 speedometer)
  FIELD_ENGINE_RPM       = 1,   // RPM (Sweeps counter-clockwise 0-8000 RPM)
  FIELD_CURRENT_GEAR     = 2,   // P, R, N, D, 1, 2, 3, etc.
  FIELD_CONSUMPTION_L100 = 3,   // Litres / 100km fuel economy
  FIELD_WATER_TEMP_C     = 4,   // Coolant temperature in Celsius (normal: 90°C)
  FIELD_OIL_TEMP_C       = 5,   // Oil temperature in Celsius (normal: 95°C)
  FIELD_LIGHT_LOW_BEAM   = 6,   // 0 or 1
  FIELD_LIGHT_HIGH_BEAM  = 7,   // 0 or 1
  FIELD_LIGHT_FOG_FRONT  = 8,   // 0 or 1
  FIELD_LIGHT_FOG_REAR   = 9,   // 0 or 1
  FIELD_WARN_ENGINE_CEL  = 10,  // 0 or 1 (Check engine / overheat alert)
  FIELD_WARN_ABS         = 11,  // 0 or 1 (ABS indicator)
  FIELD_WARN_TRACTION    = 12,  // 0 or 1 (DSC / TC indicator)
  FIELD_WARN_HANDBRAKE   = 13,  // 0 or 1 (Brake system / parking brake)
  FIELD_TURN_LEFT        = 14,  // 0 or 1 (Left arrow blinker)
  FIELD_TURN_RIGHT       = 15,  // 0 or 1 (Right arrow blinker)
  FIELD_IGNITION_STATE   = 16   // 0=Off/Sleep, 1=Acc, 2=Ignition ON (cluster wakes)
};

#endif // ASTON_MARTIN_DB9_SIMHUB_CONFIG_H
`;

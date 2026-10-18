/*
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
#define SIMHUB_CONNECT_MESSAGE       "<S;0;0;N;24;90;95;0;0;0;0;0;0;0;1;0;0;2>\n"
#define SIMHUB_DISCONNECT_MESSAGE    "<S;0;0;N;0;0;0;0;0;0;0;0;0;0;0;0;0;0>\n"

// ------------------------------------------------------------------------------
// SimHub NCalc Formula (Paste into "Update message" -> "NCalc" in SimHub)
// ------------------------------------------------------------------------------
/*
format('<S;{0};{1};{2};{3};{4};{5};{6};{7};{8};{9};{10};{11};{12};{13};{14};{15};{16}>\n',
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

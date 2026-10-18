/*
 * ==============================================================================
 * Aston Martin DB9 / V8 Vantage (Volvo PAG Platform) CAN Bus Definitions
 * Header File: Aston_Martin_DB9_CAN_Defs.h
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

#ifndef G30_CLUSTER_CORE_H
#define G30_CLUSTER_CORE_H

// BMW G30 bench cluster adaptation of user's uploaded SHCustomProtocol(1).h.
// Uses ONLY IDs observed in that source. Outputs are experimental on actual G30 clusters.
// Hardware: Arduino Mega 2560 + MCP2515 Seeed CAN-BUS Shield V2.0, 16MHz, CS D9, 500kbps.
// Requires "MCP_CAN_lib" (mcp_can.h) by Cory J. Fowler.

#include <Arduino.h>
#include <SPI.h>
#include <mcp_can.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#ifndef G30_CAN_CS_PIN
#define G30_CAN_CS_PIN 9
#endif
#ifndef G30_CAN_SPEED
#define G30_CAN_SPEED CAN_500KBPS
#endif

// These extra transmissions are individually disabled until bench-tested.
#define G30_ENABLE_CHECK_CONTROL   1  // IDs 0x5C0; alerts from the uploaded source
#define G30_ENABLE_DSC_MODE        1  // ID  0x31B; DSC Off / traction mode (candidate)
#define G30_ENABLE_IGNITION       1  // IDs 0x510, 0x12F, 0x03C; source wake sequences
#define G30_ENABLE_FUEL_FRAME     1  // ID 0x349 from original source. EXPERIMENTAL scale.
// 0x349 donor / BMW reference: 2 x 16-bit little-endian tank-sender values.
// The values are TEST estimates, not a confirmed G30 sender calibration.
#define G30_FUEL_FULL_RAW      4800  // Per tank at 100%; approx 30 L using published donor factor
#define G30_FUEL_EMPTY_RAW        0
#define G30_FUEL_SWAP_ENDIAN     0  // 0=LE (BMW reference); 1=legacy big-endian bench test
#define G30_FUEL_DLC             5  // Original BMW source DLC, don't invent missing bytes
// No source-confirmed AUTO-headlight activation bit. Keep normal AUTO/idle
// light-status payload (second byte 0x0C) whenever high beam is inactive.
#define G30_KEEP_LIGHT_IDLE_STATUS 1
#define G30_TEST_ABS_AS_FAULT     0  // OPTIONAL isolated bench only: 0x5C0 code 42 is brake fault, NOT ABS activity.
#define G30_TEST_TC_AS_WARNING    0  // OPTIONAL isolated bench only: 0x5C0 code 184 meaning not verified.
#define G30_TEST_TC_MODE_31B      0  // OPTIONAL isolated bench only: 0x31B byte 3=0x04 may select TRACTION mode.
#define G30_ENABLE_TPMS_ALIVE     0  // ID  0xB68; placeholder only in source
#define G30_ENABLE_CLOCK          0  // Source clock uses a fixed 2025 date; disabled by default
#define G30_ENABLE_EXTRA_ALIVE    0  // ID  0x30B; placeholder only in source
#define G30_WARN_ON_ABS_ACTIVITY  0  // Code 42 is a BRAKE FAULT, not ABS intervention
#define G30_WARN_ON_TC_ACTIVITY   0  // Code 184 check-control not proven to mean slip

class G30ClusterCore {
 public:
  MCP_CAN can;
  G30ClusterCore() : can(G30_CAN_CS_PIN) {}

  bool begin() {
    pinMode(53, OUTPUT);            // Keep ATmega2560 SPI master mode
    digitalWrite(53, HIGH);
    pinMode(G30_CAN_CS_PIN, OUTPUT);
    SPI.begin();
    canReady = (can.begin(MCP_ANY, G30_CAN_SPEED, MCP_16MHZ) == CAN_OK);
    if (canReady) can.setMode(MCP_NORMAL);
    return canReady;
  }

  // Serial line format: G30;rpm;kmh;fuel;coolant;oil;throttle;gear;left;right;
  // high;low;fog;brake;abs;tc;esc;escOff;cruise;setKmh;mode;ign;
  // LFdoor;RFdoor;LRdoor;RRdoor;hood;boot;tpms;engineWarn;speedWarn;hour;minute;heartbeat
  bool processLine(const char* line) {
    if (!line || strncmp(line, "G30;", 4) != 0) return false;
    // Use no heap allocation, and reject malformed frames rather than partially updating.
    char text[256];
    size_t length = strlen(line);
    if (length >= sizeof(text)) return false;
    memcpy(text, line, length + 1);
    char* save = NULL;
    char* tok = strtok_r(text, ";", &save);
    if (!tok || strcmp(tok, "G30")) return false;
    long n[33];
    for (uint8_t i = 0; i < 33; ++i) {
      tok = strtok_r(NULL, ";", &save);
      if (!tok || !*tok) return false;
      char* end = NULL;
      long value = strtol(tok, &end, 10);
      if (*end != '\0') return false;
      n[i] = value;
    }
    if (strtok_r(NULL, ";", &save) != NULL) return false;
    rpm = clamp(n[0], 0, 8500);
    speedKmh = clamp(n[1], 0, 330);
    fuelPct = clamp(n[2], 0, 100);
    coolant = clamp(n[3], -40, 150);
    oilTemp = clamp(n[4], -40, 170);
    throttle = clamp(n[5], 0, 100);
    gear = clamp(n[6], 0, 22); // P=0 R=1 N=2 D=3 D1..D9=4..12 S=13 S1..S9=14..22
    left = !!n[7]; right = !!n[8]; highBeam = !!n[9]; lowBeam = !!n[10]; fog = !!n[11];
    handbrake = !!n[12]; absActive = !!n[13]; tcActive = !!n[14]; escActive = !!n[15];
    escOff = !!n[16]; cruiseActive = !!n[17]; cruiseSetKmh = clamp(n[18], 0, 330);
    driveMode = clamp(n[19], 0, 4); ignition = clamp(n[20], 0, 2);
    for (uint8_t i = 0; i < 6; ++i) doors[i] = !!n[21+i];
    tpmsWarn = !!n[27]; engineWarn = !!n[28]; speedWarn = !!n[29];
    hour = clamp(n[30], 0, 23); minute = clamp(n[31], 0, 59);
    lastDataMs = millis(); hasData = true;
    return true;
  }

  void tick() {
    if (!canReady) return;
    unsigned long t = millis();
    // SimHub custom formula uses an updating heartbeat, but allow safe timeout anyway.
    bool stale = !hasData || (uint32_t)(t - lastDataMs) > 1200;
    if (stale && !wasStale) { resetAfterTimeout(); }
    wasStale = stale;

    if ((uint32_t)(t - fastMs) >= 20) {
      uint32_t dt = fastMs ? t - fastMs : 20;
      fastMs = t;
      float aSpeed = (float)dt / (95.0f + dt);
      float aRpm = (float)dt / (100.0f + dt);
      smoothedSpeed += (speedKmh - smoothedSpeed) * aSpeed;
      smoothedRpm += (rpm - smoothedRpm) * aRpm;
      sendSpeed();
      sendRpm();
      counter4 = (counter4 + 1) & 0x0F;
    }
    if ((uint32_t)(t - mediumMs) >= 50) {
      mediumMs = t;
      sendGear();
      sendLights();
      sendIndicators();
      sendBacklight();
      #if G30_ENABLE_IGNITION
      sendIgnition(false); // Send one running/ACC 0x03C protected frame at 20 Hz
      #endif
    }
    if ((uint32_t)(t - statusMs) >= 100) {
      statusMs = t;
      sendBrake();
      brakeCounter4 = (brakeCounter4 + 1) & 0x0F;
      sendAbsNormal();
      absCounter4 = (absCounter4 + 1) & 0x0F;
      sendOilAndCoolant();
      sendDriveMode();
      #if G30_ENABLE_DSC_MODE
      sendDscMode();
      #endif
    }
    if ((uint32_t)(t - wakeMs) >= 200) {
      wakeMs = t;
      #if G30_ENABLE_IGNITION
      sendIgnition(true);
      #endif
      #if G30_ENABLE_CLOCK
      sendTime();
      #endif
      #if G30_ENABLE_FUEL_FRAME
      sendFuelEstimated();
      #endif
      #if G30_ENABLE_TPMS_ALIVE
      uint8_t d[8] = {0, wakeCount,0,0,0,0,0,0}; send(0xB68, d, 8);
      #endif
      #if G30_ENABLE_EXTRA_ALIVE
      uint8_t d[8] = {wakeCount,(uint8_t)(0x50 | (wakeCount & 0x0F)),3,0xC8,0x70,0,0xFF,0x1F}; send(0x30B,d,8);
      #endif
      ++wakeCount;
    }
    #if G30_ENABLE_CHECK_CONTROL
    if ((uint32_t)(t - warningMs) >= 25) {
      warningMs = t;
      sendOneCheckControl();
    }
    #endif
  }
  bool ready() const { return canReady; }
  uint16_t sentFrames() const { return frameCount; }

 private:
  bool canReady = false, hasData = false, wasStale = true;
  uint32_t lastDataMs = 0, fastMs = 0, mediumMs = 0, statusMs = 0, wakeMs = 0, warningMs = 0;
  uint16_t frameCount = 0;
  uint8_t counter4 = 0, brakeCounter4 = 0, absCounter4 = 0, gearRolling4 = 0, wakeCount = 0, ignIndex = 0, checkIndex = 0;
  int rpm = 0, speedKmh = 0, fuelPct = 50, coolant = 85, oilTemp = 90, throttle = 0;
  int gear = 0, cruiseSetKmh = 0, driveMode = 1, ignition = 0, hour = 12, minute = 0;
  bool left = false, right = false, highBeam = false, lowBeam = false, fog = false;
  bool handbrake = false, absActive = false, tcActive = false, escActive = false, escOff = false;
  bool cruiseActive = false, doors[6] = {0}, tpmsWarn = false, engineWarn = false, speedWarn = false;
  float smoothedSpeed = 0.0f, smoothedRpm = 0.0f;

  static int clamp(long x, int minimum, int maximum) {
    if (x < minimum) return minimum;
    if (x > maximum) return maximum;
    return (int)x;
  }
  void resetAfterTimeout() {
    rpm = speedKmh = throttle = 0; gear = 0; ignition = 0;
    left = right = highBeam = lowBeam = fog = handbrake = false;
    absActive = tcActive = escActive = escOff = cruiseActive = false;
    for(uint8_t i=0;i<6;i++) doors[i] = false;
    tpmsWarn = engineWarn = speedWarn = false;
  }
  // BMW CAN CRC8: J1850 polynomial 0x1D, initial 0xFF, message-specific xor-out.
  // Matches algorithm in referenced BMW F-series SimHub implementations.
  static uint8_t crc8(const uint8_t* bytes, uint8_t len, uint8_t xorOut) {
    uint8_t crc = 0xFF;
    for (uint8_t i = 0; i < len; ++i) {
      crc ^= bytes[i];
      for (uint8_t bit = 0; bit < 8; ++bit)
        crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x1D) : (uint8_t)(crc << 1);
    }
    return crc ^ xorOut;
  }
  void send(uint32_t id, const uint8_t* bytes, uint8_t len) {
    if (canReady && len <= 8) {
      if (can.sendMsgBuf(id, 0, len, const_cast<uint8_t*>(bytes)) == CAN_OK) ++frameCount;
    }
  }
  // Final CAN packet uses CRC first, then payload bytes. len <= 7.
  void sendCrc(uint32_t id, const uint8_t* bytes, uint8_t len, uint8_t xorOut) {
    uint8_t d[8]; d[0] = crc8(bytes, len, xorOut);
    for (uint8_t i = 0; i < len; i++) d[i + 1] = bytes[i];
    send(id, d, len + 1);
  }
  void sendSpeed() {  // 0x1A1, speed scaled 63.4 (source)
    uint16_t v = (uint16_t)(smoothedSpeed * 63.4f + 0.5f);
    uint8_t d[4] = { (uint8_t)(0xC0 | counter4), (uint8_t)v,
                     (uint8_t)(v >> 8), (uint8_t)(smoothedSpeed < 0.5f ? 0x81 : 0x91) };
    sendCrc(0x1A1, d, 4, 0xA9);
  }
  void sendRpm() { // 0x0F3; source's eight-byte CRC input kept unchanged
    uint16_t r = (uint16_t)(smoothedRpm * 1.557f + 0.5f);
    uint8_t d[8] = { 0xF3, (uint8_t)r, (uint8_t)(r >> 8), 0xC0,
                     (uint8_t)(throttle > 1 ? 0xF0 : 0xF5), 0xFF, 0xFF, 0xFF };
    d[0] = crc8(d, 8, 0x2C);
    send(0x0F3, d, 8);
  }
  void sendGear() { // 0x3FD, CRC from original BMW source; deterministic gear numeral.
    // Byte 2 (post-CRC) is gear number: D1/S1 = 0x11 ... D9/S9 = 0x91.
    // Byte 3 (post-CRC) is selector: P=0x20 R=0x40 N=0x60 D=0x80 Sport=0x01.
    uint8_t selector = 0x80;
    uint8_t numeral = 0x00;
    // Source rotates the low nibble even for R/N/P: fixed 0x00 caused brief display.
    if (gear == 0) { selector = 0x20; numeral = gearRolling4; }
    else if (gear == 1) { selector = 0x40; numeral = gearRolling4; }
    else if (gear == 2) { selector = 0x60; numeral = gearRolling4; }
    else if (gear == 13) selector = 0x01; // S (no numbered gear available)
    else if (gear >= 4 && gear <= 12) {
      selector = 0x80; // D1 through D9
      numeral = (uint8_t)(0x10 + (gear - 4) * 0x10 + gearRolling4);
    } else if (gear >= 14 && gear <= 22) {
      selector = 0x01; // S1 through S9
      numeral = (uint8_t)(0x10 + (gear - 14) * 0x10 + gearRolling4);
    }
    uint8_t d[4] = {numeral, selector, 0x00, 0xFC};
    sendCrc(0x3FD, d, 4, 0xD6);
    gearRolling4 = (gearRolling4 % 15) + 1; // Cycle 1..15 as observed in the uploaded source's gear-value range.
  }
  void sendLights() { // 0x21A, high/low beam bytes observed in uploaded code
    uint8_t d[3] = {(uint8_t)((highBeam ? 0x02 : 0x00) | (lowBeam ? 0x04 : 0x00)),
                   (uint8_t)(highBeam ? 0xC0 : (G30_KEEP_LIGHT_IDLE_STATUS ? 0x0C : 0x00)), 0xF7};
    send(0x21A,d,3);
    // The uploaded source has no verified fog bit for the actual G30 cluster.
  }
  void sendIndicators() { // 0x1F6
    uint8_t b = left ? (right ? 0xB1 : 0x91) : (right ? 0xA1 : 0x00);
    uint8_t d[2] = {b, 0xF0}; send(0x1F6,d,2);
  }
  void sendBacklight() { uint8_t d[2] = {253,0xFF}; send(0x202,d,2); }
  void sendBrake() { // 0x36F, byte four 0x14 off/0x15 on
    uint8_t d[4] = {(uint8_t)(0xF0 | brakeCounter4),0x38,0x00,(uint8_t)(handbrake?0x15:0x14)};
    sendCrc(0x36F,d,4,0x17);
  }
  void sendAbsNormal() { // 0x36E: retain source's normal/fault-free data regardless of ABS activity
    uint8_t d[4] = {(uint8_t)(0xF0 | absCounter4),0xFE,0xFF,0x14};
    sendCrc(0x36E,d,4,0xD8);
  }
  void sendOilAndCoolant() { // 0x3F9 + 0x2C4 (original source formulas)
    uint8_t oil[7] = {(uint8_t)(0x10 | counter4),0x82,0x4E,
      (uint8_t)clamp(coolant+30,0,255), (uint8_t)clamp(oilTemp+50,0,255),0x05,0x89};
    sendCrc(0x3F9,oil,7,0xF1);
    uint8_t cool[7] = {0x3E,(uint8_t)clamp(coolant,0,255),0x64,0x64,0x64,0x01,0xF1};
    sendCrc(0x2C4,cool,7,0xB2);
  }
  void sendDriveMode() { // 0x3D8 — force byte 2 (d[1]) to 0x02 for requested Sport-mode bench test.
    // All other bytes and the original 100 ms schedule are unchanged.
    // On-cluster interpretation of this exact 0x02 value remains unverified.
    uint8_t d[8] = {0xCF,0x02,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF};
    send(0x3D8,d,8);
  }
  void sendDscMode() { // 0x31B: original says third byte 1=DSC off, 4=Traction
    uint8_t mode = escOff ? 0x01 : ((G30_TEST_TC_MODE_31B && tcActive) ? 0x04 : 0x00); // Never interpret transient wheel slip as driver selecting Traction/DSC OFF.
    uint8_t d[8] = {0,0,mode,0,0,0,0,0}; send(0x31B,d,8);
  }
  void sendTime() { // 0x39E from original sample, fixed date 2025 to match source
    uint8_t d[8] = {(uint8_t)hour,(uint8_t)minute,0,0x05,0x5F,0xE9,0x07,0xF2};
    send(0x39E,d,8);
  }
  void sendFuelEstimated() { // Experimental source-derived 0x349 frame; two repeated 16-bit BE words.
    // BMW donor source expects quantity, not necessarily fuel percentage.
    // G30_FUEL_FULL_RAW MUST be calibrated using observed cluster response.
    uint16_t raw = (uint16_t)(G30_FUEL_EMPTY_RAW + ((long)fuelPct * (G30_FUEL_FULL_RAW - G30_FUEL_EMPTY_RAW) + 50) / 100);
    uint8_t lo = (uint8_t)raw, hi = (uint8_t)(raw >> 8);
    uint8_t d[5] = { G30_FUEL_SWAP_ENDIAN ? hi : lo,
                     G30_FUEL_SWAP_ENDIAN ? lo : hi,
                     G30_FUEL_SWAP_ENDIAN ? hi : lo,
                     G30_FUEL_SWAP_ENDIAN ? lo : hi, 0x00 };
    send(0x349, d, G30_FUEL_DLC);
  }
  void sendIgnition(bool wakeFrames) { // Pre-recorded 0x03C at 20 Hz, 0x510/0x12F at 5 Hz
    if (ignition == 2) {
      if (wakeFrames) {
        uint8_t d510[8] = {0x40,0x10,0x00,0x02,0x02,0x12,0x11,0}; send(0x510,d510,8);
        uint8_t d12[8] = {wakeCount,(uint8_t)(0x70 | (wakeCount & 0x0F)),0xFA,0xDD,0xFF,0xFF,0xFF,0x01}; send(0x12F,d12,8);
      }
      static const uint8_t precrc[16] = {0xD7,0x8A,0x6D,0x30,0xBE,0xE3,0x04,0x59,0x05,0x58,0xBF,0xE2,0x6C,0x31,0xD6};
      if (!wakeFrames) {
        uint8_t d03[8] = {precrc[ignIndex % 15],(uint8_t)(0xA0|(ignIndex%15)),0x02,0x12,0x11,0,0x2A,0xFF};
        send(0x03C,d03,8);
      }
    } else if (ignition == 1) {
      if (wakeFrames) {
        uint8_t d510[8] = {0x40,0x10,0x10,0,0,0x12,0x11,0}; send(0x510,d510,8);
        uint8_t d12[8] = {wakeCount,(uint8_t)(0x20|(wakeCount&0x0F)),0xF6,0x2D,0xFF,0xFF,0xFF,0}; send(0x12F,d12,8);
      }
      static const uint8_t precrc[16] = {0x72,0x2F,0xC8,0x95,0x1B,0x46,0xA1,0xFC,0xA0,0xFD,0x1A,0x47,0xC9,0x94,0x73};
      if (!wakeFrames) {
        uint8_t d03[8] = {precrc[ignIndex%15],(uint8_t)(0x50 | (ignIndex%15)),0,0x12,0x11,0,0xE5,0xFF};
        send(0x03C,d03,8);
      }
    }
    if (!wakeFrames) ignIndex = (ignIndex + 1) % 15;
  }
  void sendOneCheckControl() { // 0x5C0; each code and its 0x28/0x29 state comes from user's uploaded source
    static const uint16_t codes[] = {14,15,16,17,18,19,39,42,36,184,215,63,34,62,176};
    uint16_t code = codes[checkIndex]; bool active = false;
    switch (code) {
      case 14:active=doors[0];break; case 15:active=doors[1];break;
      case 16:active=doors[2];break; case 17:active=doors[3];break;
      case 18:active=doors[4];break; case 19:active=doors[5];break;
      case 39:active=coolant>130;break;
      case 42:active=((G30_WARN_ON_ABS_ACTIVITY || G30_TEST_ABS_AS_FAULT) && absActive);break;
      case 36:active=escOff;break;
      case 184:active=((G30_WARN_ON_TC_ACTIVITY || G30_TEST_TC_AS_WARNING) && tcActive);break;
      case 215:active=escActive;break;
      case 63:active=tpmsWarn;break;
      case 34:active=engineWarn;break;
      case 62:active=speedWarn;break;
      case 176:active=cruiseActive;break;
    }
    uint8_t d[8] = {0x40,(uint8_t)(code&0xFF),0x00,
                   (uint8_t)(active?0x29:0x28),0xFF,0xFF,0xFF,0xFF};
    send(0x5C0,d,8);
    checkIndex = (checkIndex + 1) % (sizeof(codes)/sizeof(codes[0]));
  }
};

#endif

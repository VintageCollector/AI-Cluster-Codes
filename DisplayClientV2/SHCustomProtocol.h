#ifndef __SHCUSTOMPROTOCOL_H__
#define __SHCUSTOMPROTOCOL_H__

#include <Arduino.h>
#include <SPI.h>
#include <mcp2515_can.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>

// SimHub custom-protocol header. Not a standalone Arduino sketch.
// Mega 2560 + Seeed CAN-BUS Shield V2.0. Isolated simulator cluster only.
namespace GTR {
const uint8_t CS_PIN = 9;
const uint32_t PERIOD_MS = 10; // Repeat each enabled frame every 10 ms.
const uint32_t TIMEOUT_MS = 1500;
const uint32_t BITRATE = CAN_500KBPS; // Assumption inherited from supplied code.
const uint8_t HIGH_BEAM_BITS = 0x08; // Latest document confirms 0x08, superseding the older 0x09.
const bool ENABLE_REFERENCE_IGNITION = false; // 0x12F: supplied code, not workbook.
const bool ENABLE_REFERENCE_COOLANT = false;  // Offset +42: supplied code only.
// Optional logic output to an EXISTING, suitable relay driver, never cluster 12 V.
const bool ENABLE_IGNITION_OUTPUT = false;
const uint8_t IGNITION_PIN = 5;
// Logic signal to a suitable relay driver only; never power a relay coil here.
const uint8_t OIL_RELAY_PIN = 40;
const bool OIL_RELAY_ACTIVE_LOW = false; // true for active-low relay modules
inline void oilRelay(bool warning) {
  digitalWrite(OIL_RELAY_PIN, (warning != OIL_RELAY_ACTIVE_LOW) ? HIGH : LOW);
}

enum Feature : uint8_t {
  ACC, ON, START, PARKING, LOW_BEAM, FOG, HIGH_BEAM, LEFT, RIGHT,
  CHECK_ENGINE, HANDBRAKE, CRUISE, FEATURE_COUNT
};
enum FrameIndex : uint8_t {
  RPM_FRAME, SPEED_FRAME, GEAR_FRAME, LIGHT_FRAME, TEMP_FRAME,
  IGNITION_FRAME, AWD_FRAME, ABS_FRAME, TURBO_FRAME, TPMS_FRAME, FRAME_COUNT
};
struct Frame {
  uint16_t id;
  bool enabled;
  uint8_t data[8];
};
// Edit these base bytes only with a known capture. Unmapped bytes are zero.
// 0x1A5 remains unmapped. The new document defines 0x354 byte 5.
static const Frame BASE[FRAME_COUNT] = {
  {0x180, true,  {0}},
  {0x284, true,  {0}},
  {0x421, true,  {0}}, // ID from supplied code; values from workbook.
  {0x60D, true,  {0}}, // ID from supplied code; values from workbook.
  {0x551, true,  {0}},
  {0x12F, ENABLE_REFERENCE_IGNITION, {0xFB,0,0,0x1C,0xF1,0x05,0x30,0x86}},
  {0x1A5, false, {0}},
  {0x354, true, {0}},
  {0x59C, true, {0}},
  {0x358, true, {0}}
};
struct BitMapping {
  Feature feature;
  uint8_t frame; // FrameIndex; 255 means unknown/disabled.
  uint8_t byteIndex; // Zero based: workbook Byte 1 = index 0.
  uint8_t mask;
  uint8_t offValue;
  uint8_t onValue;
};
// Unknown entries deliberately do not send guessed bits. Replace 255, index,
// mask and values when measured. Also enable the destination frame in BASE.
static const BitMapping BITS[] = {
  {PARKING, LIGHT_FRAME, 0, 0x04, 0x00, 0x04},
  {HIGH_BEAM, LIGHT_FRAME, 1, HIGH_BEAM_BITS, 0x00, HIGH_BEAM_BITS},
  {LEFT, LIGHT_FRAME, 1, 0x20, 0x00, 0x20},
  {RIGHT, LIGHT_FRAME, 1, 0x40, 0x00, 0x40},
  {ACC, 255, 0, 0, 0, 0},
  {ON, 255, 0, 0, 0, 0},
  {START, 255, 0, 0, 0, 0},
  {LOW_BEAM, 255, 0, 0, 0, 0},
  {FOG, LIGHT_FRAME, 2, 0x04, 0x00, 0x04},
  {CHECK_ENGINE, TEMP_FRAME, 3, 0x60, 0x00, 0x20},
  {HANDBRAKE, 255, 0, 0, 0, 0},
  {CRUISE, 255, 0, 0, 0, 0}
};

// User confirms TC-off+ABS: 0x30 and 0x28 have the same lamp behavior on this cluster.
// Keep 0x30 by default; false selects the user-confirmed 0x28 alternative.
const bool DOCUMENT_TC_OFF_ABS_30 = true;
// state: 0 normal, 1 TC active/blinking, 2 TC off/solid+VDC, 3 VDC off.
inline uint8_t warningByte(uint8_t state, bool abs, bool handbrake) {
  static const uint8_t table[4][4] = {
    {0x00,0x02,0x08,0x0A}, {0x80,0x82,0x88,0x8A},
    {0x20,0x22,0x30,0x2A}, {0x40,0x42,0x48,0x4A}
  };
  uint8_t value=table[state][(abs?2:0)|(handbrake?1:0)];
  if (state==2 && abs && !handbrake && !DOCUMENT_TC_OFF_ABS_30) value=0x28;
  return value;
}
inline long bounded(long value, long low, long high) {
  return value < low ? low : (value > high ? high : value);
}
inline bool integer(const char* text, long& value) {
  if (!text || !*text) return false;
  if (*text != '-' && (*text < '0' || *text > '9')) return false;
  if (*text == '-' && !text[1]) return false;
  for (const char* p=text+1; *p; ++p) if (*p<'0' || *p>'9') return false;
  char* end;
  errno = 0;
  value = strtol(text, &end, 10);
  return errno != ERANGE && *end == '\0';
}
inline uint8_t rpmByte(uint16_t rpm) {
  // Exact workbook samples through 2000 RPM; interpolate between samples.
  static const uint8_t samples[] = {0,9,17,26,33,42,49,58,65};
  if (rpm <= 2000) {
    uint8_t section = rpm / 250;
    if (section == 8) return samples[8];
    return samples[section] +
      ((uint32_t)(samples[section+1]-samples[section]) * (rpm % 250) + 125) / 250;
  }
  // Above 2000: APPROXIMATE continuation using supplied code's RPM*8 slope.
  // No workbook calibration is supplied above 2000. Only Byte 1 is defined.
  return (uint8_t)bounded(65L + ((uint32_t)(rpm-2000)*8UL+128)/256UL, 0, 255);
}
inline uint8_t gearByte(char* gear) {
  for (char* p = gear; *p; ++p) if (*p >= 'a' && *p <= 'z') *p -= 32;
  if (!strcmp(gear,"P")) return 0x0A;
  if (!strcmp(gear,"N") || !strcmp(gear,"0")) return 0x1A;
  if (!strcmp(gear,"R") || !strcmp(gear,"-1")) return 0x10;
  if (!strcmp(gear,"D")) return 0x20;
  if (!strcmp(gear,"L")) return 0x30;
  static const uint8_t normal[] = {0x40,0x4A,0x50,0x5A,0x60,0x6A};
  static const uint8_t manual[] = {0x80,0x8A,0x90,0x9A,0xA0,0xAA,0xB0,0xBA};
  static const uint8_t automatic[] = {0xC0,0xCA,0xD0,0xDA,0xE0,0xEA,0xF0,0xFA};
  char mode = 0;
  if (*gear == 'M' || *gear == 'A') mode = *gear++;
  long n;
  if (!integer(gear,n) || n < 1 || n > 8) return 0x1A;
  if (mode == 'M') return manual[n-1];
  if (mode == 'A') return automatic[n-1];
  // User requests numbered gears 1-8 use the workbook's M1-M8 bytes.
  return manual[n-1];
}
} // namespace GTR

class SHCustomProtocol {
 private:
  mcp2515_can canBus{GTR::CS_PIN};
  GTR::Frame frames[GTR::FRAME_COUNT];
  bool features[GTR::FEATURE_COUNT] = {};
  bool ready = false;
  bool haveData = false;
  uint16_t rpm = 0;
  uint16_t speed = 0;
  int16_t coolant = 0;
  uint8_t gear = 0x1A;
  uint8_t cruiseMode = 0; // 0=off, 1=CRUISE, 2=CRUISE+SET, 3=flashing SET.
  bool absActive=false, turbo=false, tpms=false, oilWarning=false;
  uint8_t tcState=0, checkMode=0, setSpeed=0;
  uint8_t counter = 0;
  uint8_t nextFrame = 0;
  uint32_t lastData = 0;
  uint32_t lastBuild = 0;
  uint32_t lastAttempt[GTR::FRAME_COUNT] = {};
  uint32_t lastErrorLog = 0;
  uint16_t enqueueErrors = 0;

  void buildFrames() {
    GTR::oilRelay(oilWarning);
    memcpy(frames, GTR::BASE, sizeof(frames));
    frames[GTR::RPM_FRAME].data[0] = GTR::rpmByte(rpm);
    // Retained road-speed calibration: Byte 5 = 0x06 per 10 km/h.
    // Input stays km/h; measured USA dial needs division by 1.609344 before its 0.6 scale.
    frames[GTR::SPEED_FRAME].data[4] = (speed * 600000UL + 804672UL) / 1609344UL;
    frames[GTR::GEAR_FRAME].data[0] = gear;
    frames[GTR::TEMP_FRAME].data[0] = 0x5B; // Document start value; no invented C conversion.
    if (GTR::ENABLE_REFERENCE_COOLANT)
      frames[GTR::TEMP_FRAME].data[0] = GTR::bounded((long)coolant+42,0,255);
    static const uint8_t cruiseBytes[] = {0x00,0x50,0x40,0x60};
    frames[GTR::TEMP_FRAME].data[5] = cruiseBytes[cruiseMode];
    frames[GTR::TEMP_FRAME].data[4] = cruiseMode ? setSpeed : 0;
    frames[GTR::ABS_FRAME].data[4] = GTR::warningByte(tcState,absActive,features[GTR::HANDBRAKE]);
    frames[GTR::TURBO_FRAME].data[4] = turbo ? 0x40 : 0x00;
    frames[GTR::TPMS_FRAME].data[1] = tpms ? 0x01 : 0x00;
    frames[GTR::TPMS_FRAME].data[4] = tpms ? 0x80 : 0x00;
    // Byte 3 trunk message remains zero: no confirmed value supplied.
    frames[GTR::IGNITION_FRAME].data[1] = counter++;
    // Original reference only distinguishes ON versus OFF. START holds ON;
    // ACC does not assert ON. Separate ACC/START bits remain unmapped.
    frames[GTR::IGNITION_FRAME].data[2] = features[GTR::ON] ? 0x8A : 0x00;
    for (uint8_t i=0; i<sizeof(GTR::BITS)/sizeof(GTR::BITS[0]); ++i) {
      const GTR::BitMapping& m = GTR::BITS[i];
      if (m.frame >= GTR::FRAME_COUNT || m.byteIndex >= 8 || !m.mask) continue;
      uint8_t& target = frames[m.frame].data[m.byteIndex];
      target = (target & (uint8_t)~m.mask) |
        (((features[m.feature] || (m.feature==GTR::PARKING && features[GTR::LOW_BEAM])) ? m.onValue : m.offValue) & m.mask);
    }
    // Apply mode after legacy bit table so flashing does not get overwritten.
    frames[GTR::TEMP_FRAME].data[3] = checkMode==2 ? 0x40 : (checkMode==1 ? 0x20 : 0);
    if (GTR::ENABLE_IGNITION_OUTPUT)
      digitalWrite(GTR::IGNITION_PIN, features[GTR::ON] ? HIGH : LOW);
  }

 public:
  void setup() {
    GTR::oilRelay(false); // preload inactive level before enabling the pin
    pinMode(GTR::OIL_RELAY_PIN, OUTPUT);
    pinMode(53, OUTPUT);
    digitalWrite(53, HIGH);
    if (GTR::ENABLE_IGNITION_OUTPUT) {
      pinMode(GTR::IGNITION_PIN, OUTPUT);
      digitalWrite(GTR::IGNITION_PIN, LOW);
    }
    ready = canBus.begin(GTR::BITRATE, MCP_16MHz) == CAN_OK;
    if (ready) ready = canBus.setMode(MODE_NORMAL) == CAN_OK;
    FlowSerialDebugPrintLn(ready ? "GT-R CAN ready" : "GT-R CAN init failed");
    buildFrames();
  }

  void read() {
    // SimHub appends newline. Consume the complete message, then validate it.
    String message = FlowSerialReadStringUntil('\n');
    message.trim();
    if (message.length() == 0 || message.length() >= 160) return;
    char buffer[160];
    message.toCharArray(buffer,sizeof(buffer));
    char* fields[22];
    fields[0] = buffer;
    uint8_t count = 1;
    for (char* p=buffer; *p; ++p) {
      if (*p != ';') continue;
      if (count >= 22) return;
      *p = '\0';
      fields[count++] = p+1;
    }
    if (count != 22) return;
    long values[22] = {};
    for (uint8_t i=0; i<22; ++i) {
      if (i != 2 && !GTR::integer(fields[i],values[i])) return;
    }
    // Validate all fields before changing live state. Versioned 22-field contract.
    if (values[15]!=4 || values[21]<0 || values[21]>1 || values[20]<0 || values[20]>1 || values[16]<0 || values[16]>1 || values[17]<0 || values[17]>3 ||
        values[18]<0 || values[18]>1 || values[19]<0 || values[19]>255 ||
        values[4]<0 || values[4]>3 || values[11]<0 || values[11]>2 ||
        values[13]<0 || values[13]>3 || values[14]<0 || values[14]>999999) return;
    for (uint8_t i=5;i<=12;++i) if(i!=11 && (values[i]<0 || values[i]>1)) return;
    // rpm;kmh;gear;coolantC;key;parking;low;fog;high;left;right;
    // checkMode;handbrake;cruiseMode;heartbeat;version;abs;tcState;turbo;setKmh;tpms;oilWarning
    absActive = values[16]; tcState=values[17]; turbo=values[18]; setSpeed=values[19]; tpms=values[20]; oilWarning=values[21];
    checkMode=values[11];
    rpm = GTR::bounded(values[0],0,8000);
    speed = GTR::bounded(values[1],0,340);
    gear = GTR::gearByte(fields[2]);
    coolant = GTR::bounded(values[3],-40,150);
    const uint8_t key = GTR::bounded(values[4],0,3);
    features[GTR::ACC] = key >= 1;
    features[GTR::ON] = key >= 2;
    features[GTR::START] = key == 3;
    features[GTR::PARKING] = values[5] != 0;
    features[GTR::LOW_BEAM] = values[6] != 0;
    features[GTR::FOG] = values[7] != 0;
    features[GTR::HIGH_BEAM] = values[8] != 0;
    features[GTR::LEFT] = values[9] != 0;
    features[GTR::RIGHT] = values[10] != 0;
    features[GTR::CHECK_ENGINE] = values[11] != 0;
    features[GTR::HANDBRAKE] = values[12] != 0;
    cruiseMode = GTR::bounded(values[13],0,3);
    features[GTR::CRUISE] = cruiseMode != 0;
    haveData = true;
    lastData = millis();
  }

  void loop() {
    if (!haveData) return;
    const uint32_t now = millis();
    if ((uint32_t)(now-lastData) > GTR::TIMEOUT_MS) {
      rpm = speed = 0;
      gear = 0x1A;
      cruiseMode = checkMode = tcState = setSpeed = 0;
      absActive = turbo = tpms = oilWarning = false;
      memset(features,0,sizeof(features));
    }
    if ((uint32_t)(now-lastBuild) >= GTR::PERIOD_MS) {
      lastBuild = now;
      buildFrames();
    }
    if (!ready) return; // Relay and watchdog remain usable if CAN initialization fails.
    // At most one nonblocking enqueue per SimHub loop. Frames serialize on CAN.
    for (uint8_t checked=0; checked<GTR::FRAME_COUNT; ++checked) {
      uint8_t i = nextFrame;
      nextFrame = (nextFrame+1) % GTR::FRAME_COUNT;
      if (!frames[i].enabled || (uint32_t)(now-lastAttempt[i]) < GTR::PERIOD_MS) continue;
      lastAttempt[i] = now;
      if (canBus.trySendMsgBuf(frames[i].id,0,0,8,frames[i].data) != CAN_OK)
        ++enqueueErrors;
      break;
    }
    if (enqueueErrors && (uint32_t)(now-lastErrorLog) >= 5000) {
      lastErrorLog = now;
      enqueueErrors = 0;
      FlowSerialDebugPrintLn("GT-R CAN queue busy: check ACK, wiring and bitrate");
    }
  }
  void idle() {} // Keep SimHub's serial critical path fast.
};
#endif

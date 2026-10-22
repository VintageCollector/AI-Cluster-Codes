#ifndef __SHCUSTOMPROTOCOL_H__
#define __SHCUSTOMPROTOCOL_H__
// Alternative for the SimHub-generated "Arduino > My Hardware" sketch,
// which provides FlowSerialReadStringUntil() and calls this class lifecycle.
#include "G30ClusterCore.h"
class SHCustomProtocol {
  G30ClusterCore core;
public:
  void setup() { core.begin(); }
  void read() {
    String line = FlowSerialReadStringUntil('\n');
    core.processLine(line.c_str());
  }
  void loop() { core.tick(); }
  void idle() {}
};
#endif

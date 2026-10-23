#ifndef SH_PANAMERA_CUSTOM_PROTOCOL_H
#define SH_PANAMERA_CUSTOM_PROTOCOL_H
#include <Arduino.h>
#include <SPI.h>
#include <mcp2515_can.h>
#include "PanameraProtocol.h"
class SHCustomProtocol {
private:
 mcp2515_can canBus{9};
 Panamera::State state;
 Panamera::Frame frames[Panamera::FRAME_COUNT];
 bool ready=false,haveData=false;
 uint32_t lastData=0,lastBuild=0,lastInit=0,lastLog=0,menuPressed=0;
 uint32_t lastAttempt[Panamera::FRAME_COUNT]={};
 uint8_t next=0,previousMenu=0;
 bool menuPending=false,menuRelease=false;
 uint16_t queueErrors=0;
 void initCan(){
  ready=canBus.begin(CAN_500KBPS,MCP_16MHz)==CAN_OK;
  if(ready)ready=canBus.setMode(MODE_NORMAL)==CAN_OK;
  lastInit=millis();FlowSerialDebugPrintLn(ready?"Panamera CAN ready":"Panamera CAN init failed");
 }
 void updateFrames(){Panamera::build(state,frames);}
public:
 void setup(){pinMode(53,OUTPUT);digitalWrite(53,HIGH);initCan();updateFrames();}
 void read(){
  String message=FlowSerialReadStringUntil('\n');message.trim();
  if(!message.length()||message.length()>=256)return;
  char buffer[256];message.toCharArray(buffer,sizeof(buffer));
  Panamera::State candidate=state;if(!candidate.parse(buffer))return;
  if(candidate.v[32]!=previousMenu&&candidate.v[32])menuPending=true;
  previousMenu=candidate.v[32];state=candidate;lastData=millis();haveData=true;
 }
 void loop(){
  const uint32_t now=millis();
  if(!ready){if((uint32_t)(now-lastInit)>=5000)initCan();return;}
  if(!haveData)return;
  if((uint32_t)(now-lastData)>1500){state.reset();menuPending=menuRelease=false;previousMenu=0;}
  if((uint32_t)(now-lastBuild)>=10){lastBuild=now;updateFrames();}
  if(menuPending||(menuRelease&&(uint32_t)(now-menuPressed)>=60)){
   // A command is sent once, then one all-zero release. Baseline release needs bench confirmation.
   uint8_t payload[8]={};
   if(menuPending){switch(state.v[32]){
    case 1:payload[0]=0x12;payload[2]=1;break;
    case 2:payload[0]=0x12;payload[2]=0x0F;break;
    case 3:payload[1]=0x13;payload[2]=0x10;break;
    case 4:payload[0]=3;payload[1]=0x13;payload[2]=1;break;
   }}
   if(canBus.trySendMsgBuf(0x5BF,0,0,8,payload)==CAN_OK){if(menuPending){menuPending=false;menuRelease=true;menuPressed=now;}else menuRelease=false;}
   return;
  }
  for(uint8_t checked=0;checked<Panamera::FRAME_COUNT;checked++){
   uint8_t i=next;next=(next+1)%Panamera::FRAME_COUNT;
   if(!frames[i].enabled||(uint32_t)(now-lastAttempt[i])<10)continue;
   lastAttempt[i]=now;
   if(canBus.trySendMsgBuf(frames[i].id,0,0,frames[i].len,frames[i].data)!=CAN_OK)++queueErrors;
   break;
  }
  if(queueErrors&&(uint32_t)(now-lastLog)>=5000){lastLog=now;queueErrors=0;FlowSerialDebugPrintLn("Panamera CAN queue busy: check ACK/wiring/bitrate");}
 }
 void idle(){}
};
#endif

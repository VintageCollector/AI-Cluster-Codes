#ifndef PANAMERA_PROTOCOL_H
#define PANAMERA_PROTOCOL_H
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include "PanameraCalibration.h"
namespace Panamera {
const uint8_t FIELD_COUNT=40;
const long PROTOCOL=970;
inline long bound(long v,long lo,long hi){return v<lo?lo:(v>hi?hi:v);}
inline bool integer(const char* s,long& v){
 if(!s||!*s||(*s!='-'&&(*s<'0'||*s>'9'))||(*s=='-'&&!s[1]))return false;
 for(const char* p=s+1;*p;++p)if(*p<'0'||*p>'9')return false;
 errno=0;char* end;v=strtol(s,&end,10);return errno!=ERANGE&&*end==0;
}
template<unsigned N> inline uint16_t lookup(const Point (&p)[N],int32_t x){
 if(x<=p[0].x)return p[0].y;
 for(unsigned i=1;i<N;i++)if(x<=p[i].x){
  int32_t dx=p[i].x-p[i-1].x;
  return p[i-1].y+((int32_t)(p[i].y-p[i-1].y)*(x-p[i-1].x)+dx/2)/dx;
 }
 return p[N-1].y; // No unmeasured extrapolation.
}
inline int32_t milliMph(long kmh){return (kmh*621371L+500)/1000;}
inline long fahrenheit(long c){return (c*9L)/5+32;}
inline uint8_t psmByte(uint8_t mode,bool abs,bool brake){
 // Literal workbook values, including 29/49 overlap with BRAKE.
 static const uint8_t table[5][4]={{0,1,8,9},{0x10,0x11,0x18,0x19},
 {0x20,0x21,0x29,0x29},{0x30,0x31,0x38,0x39},{0x40,0x41,0x49,0x49}};
 return table[mode][(abs?2:0)|(brake?1:0)];
}
inline uint8_t gearNumber(const char* gear){
 const char* n=gear;if(*n=='M'||*n=='A'||*n=='S'||*n=='D')++n;
 long value;if(!integer(n,value)||value<1||value>8)return 0;
 static const uint8_t codes[]={1,2,3,4,5,8,9,10};return codes[value-1];
}
inline uint8_t gearMode(const char* g){
 if(!strcmp(g,"P"))return 0x80;if(!strcmp(g,"R")||!strcmp(g,"-1"))return 0x70;
 if(!strcmp(g,"N")||!strcmp(g,"0"))return 0x60;
 if(g[0]=='M'&&gearNumber(g))return 0xE0;
 return gearNumber(g)||!strcmp(g,"D")?0x50:0x60;
}
inline bool knownTpms(long v){
 return v==-1||v==0||v==0x55||v==0xAA||v==1||v==2||v==4||v==5||v==6||v==8||v==0x11||v==0x22;
}
struct State {
 long v[FIELD_COUNT];char gear[5];
 State(){reset();}
 void reset(){memset(v,0,sizeof(v));strcpy(gear,"N");v[15]=PROTOCOL;v[22]=-1000;v[23]=-1;v[33]=-1;v[34]=-32768;v[35]=-1;v[38]=-1000;}
 bool parse(char* text){
  char* f[FIELD_COUNT];f[0]=text;uint8_t count=1;
  for(char* p=text;*p;++p)if(*p==';'){if(count>=FIELD_COUNT)return false;*p=0;f[count++]=p+1;}
  if(count!=FIELD_COUNT||strlen(f[2])>4)return false;
  State n;
  for(uint8_t i=0;i<FIELD_COUNT;i++)if(i!=2&&!integer(f[i],n.v[i]))return false;
  if(n.v[15]!=PROTOCOL)return false;
  const uint8_t flags[]={5,6,7,8,9,10,12,16,18,20,21,24,25,26,27,28,29,37,39};
  for(uint8_t i=0;i<sizeof(flags);i++)if(n.v[flags[i]]<0||n.v[flags[i]]>1)return false;
  if(n.v[4]<0||n.v[4]>3||n.v[11]<0||n.v[11]>2||n.v[13]<0||n.v[13]>3||n.v[17]<0||n.v[17]>3||
    n.v[14]<0||n.v[14]>999999||n.v[19]<0||n.v[19]>255||n.v[22]<-1000||n.v[22]>200||n.v[23]<-1||n.v[23]>5000||
    n.v[30]<0||n.v[30]>2||n.v[31]<0||n.v[31]>11||n.v[32]<0||n.v[32]>4||
    n.v[33]<-1||n.v[33]>500||n.v[34]<-32768||n.v[34]>7160||!knownTpms(n.v[35])||n.v[36]<0||n.v[36]>4||n.v[38]<-1000||n.v[38]>2000)return false;
  strcpy(n.gear,f[2]);for(char* p=n.gear;*p;p++)if(*p>='a'&&*p<='z')*p-=32;
  n.v[0]=bound(n.v[0],0,8000);n.v[1]=bound(n.v[1],0,500);n.v[3]=bound(n.v[3],-40,150);
  *this=n;return true;
 }
};
enum FrameIndex {IGN,RPM_F,SPEED_F,GEAR_F,CRUISE_F,LIGHT_F,TURN_F,PARK_F,SAFETY_F,ENGINE_F,OILTEMP_F,
 PSM_F,TRUNK_F,TPMS_F,SPORT_F,SUSP_F,MENU_F,LIMIT_F,ALT_F,FRAME_COUNT};
struct Frame {uint16_t id;uint8_t len;bool enabled;uint8_t data[8];};
static const Frame BASE[FRAME_COUNT]={
 {0x3C0,8,true,{0}},{0x3A3,8,true,{0}},{0x105,8,true,{0}},{0x310,8,true,{0}},{0x312,8,true,{0}},
 {0x662,8,true,{0}},{0x363,8,true,{0}},{0x30D,8,true,{0}},{0x040,5,true,{0}},{0x522,8,true,{0}},
 {0x6B5,8,false,{0}},{0x38C,8,true,{0}},{0x444,8,true,{0}},{0x674,8,true,{0}},
 {0x677,8,true,{0}},{0x5EA,8,false,{0}},{0x5BF,8,false,{0}},{0x539,8,false,{0}},{0x5FA,8,false,{0}}};
inline void build(const State& s,Frame* f){
 memcpy(f,BASE,sizeof(BASE));const long* v=s.v;
 f[IGN].enabled=v[4]>=2;f[IGN].data[2]=0x02; // Only documented ON value; no guessed ACC/off sequence.
 uint16_t rpm=lookup(RPM,v[0]);f[RPM_F].data[2]=rpm&255;f[RPM_F].data[3]=rpm>>8;
 int32_t mph=milliMph(v[1]);f[SPEED_F].data[2]=lookup(SPEED3,mph);f[SPEED_F].data[5]=lookup(SPEED6,mph);
 f[GEAR_F].data[0]=gearNumber(s.gear);f[GEAR_F].data[1]=gearMode(s.gear);f[GEAR_F].data[2]=v[37]?1:0;
 if(v[13]){f[CRUISE_F].data[2]=lookup(CRUISE,milliMph(v[19]));f[CRUISE_F].data[7]=v[13]==1?0x40:0x60;}
 // Light table core bits. 10's wording is inconsistent; selected as fog family bit.
 f[LIGHT_F].data[2]=(v[5]?1:0)|(v[6]?2:0)|(v[8]?4:0)|(v[7]?0x10:0);f[LIGHT_F].data[0]=v[29]?0x10:0;
 f[TURN_F].data[2]=(v[9]?4:0)|(v[10]?8:0);
 f[PARK_F].data[0]=v[12]?0x11:0;
 f[SAFETY_F].data[3]=v[25]?1:0;f[SAFETY_F].data[4]=v[24]?1:0;
 f[ENGINE_F].data[0]=v[11]?1:0; // Only supplied CEL-alone value is flashing.
 f[ENGINE_F].data[5]=lookup(COOLANT,fahrenheit(v[3]));
 if(v[23]>=0)f[ENGINE_F].data[6]=lookup(OIL_PRESSURE,v[23]);
 f[OILTEMP_F].enabled=v[22]!=-1000;if(f[OILTEMP_F].enabled)f[OILTEMP_F].data[5]=lookup(OIL_TEMP,fahrenheit(v[22]));
 f[PSM_F].data[4]=psmByte(v[36],v[16],v[27]||v[39]);f[PSM_F].data[5]=v[26]?8:0;
 f[TRUNK_F].data[0]=v[28]?0x10:0;
 f[TPMS_F].data[0]=v[35]>=0?v[35]:0;
 f[SPORT_F].data[1]=v[30]==1?0x20:(v[30]==2?0x40:0);
 f[SUSP_F].enabled=v[31]!=0;f[SUSP_F].data[1]=0x0A;f[SUSP_F].data[2]=v[31];
 f[LIMIT_F].enabled=v[33]>=0;f[LIMIT_F].data[2]=(v[33]+2)/5; // User bench correction: speed-limit sign is in 5 km/h steps.
 f[ALT_F].enabled=v[34]!=-32768;f[ALT_F].data[7]=bound((v[34]+1000+16)/32,0,255);
 // MENU_F is enabled only by the edge-triggered sender; never continuously pressed.
}
} // namespace Panamera
#endif

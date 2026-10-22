// BMW G30 cluster - SimHub Custom Serial Devices OR Arduino Custom Protocol
// Input format: G30;... numeric fields ...;heartbeat (SimHub appends newline in Arduino mode)
// Games: BeamNG, ETS2, ATS, Assetto Corsa. Unavailable game properties => safe defaults.
// Set overrides to 0/1 (or numeric), null to read game telemetry. No additional CAN IDs.
var override = {
  ignition: null,  // 0 off / 1 ACC / 2 run
  gear: null, // e.g. P, R, N, D, D3, S, S3, M3, 1..9
  abs: null, tc: null, esc: null, escOff: null,
  high: null, low: null, fog: null, handbrake: null,
  cruise: null, setSpeedKmh: null, driveMode: null, // driveMode 0 Eco, 1 Comfort, 2 Sport, 3 Sport+, 4 DSC Off
  oilTemp: null, fuel: null, coolant: null,
  leftDoor: null, rightDoor: null, rearLeftDoor: null, rearRightDoor: null,
  hood: null, boot: null, tpms: null, engineWarning: null, speedWarning: null,
  hour: null, minute: null,
  // Bench-only overrides: null = game telemetry. Set 0/1 to test independently.
  // For live use restore to null.
};

function prop(name) {
  try { var v = $prop(name); if (v !== null && v !== undefined && v !== '') return v; } catch (e) { }
  return null;
}
function first(names, fallback) {
  for (var i=0; i<names.length; i++) {
    var v=prop(names[i]); if(v!==null) return v;
  }
  return fallback;
}
function num(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback;
  var n=Number(v); return isFinite(n)? n : fallback;
}
function isOn(v) {
  if (typeof v === 'string') {
    var s=v.toLowerCase();
    return (s==='true'||s==='1'||s==='on'||s==='yes'||s==='active');
  }
  return !!v;
}
function b(v) { return isOn(v)? 1:0; }
function clamp(n,lo,hi){ n=num(n,lo);return Math.round(Math.max(lo,Math.min(hi,n))); }
function value(ov,names,def) { return ov===null ? first(names,def) : ov; }
function gearCode(v) {
  var s=String(v===null||v===undefined?'P':v).toUpperCase().replace(/\s/g,'');
  if(s==='P'||s==='PARK')return 0;
  if(s==='R'||s==='REVERSE'||s==='-1')return 1;
  if(s==='N'||s==='NEUTRAL'||s==='0')return 2;
  if(s==='D'||s==='DRIVE')return 3;
  if(s==='S'||s==='SPORT')return 13;
  // For example D5, S5, M5, or a numerical 5 from BeamNG/Assetto Corsa.
  // The manual / sport number requests Sport selector (0x01).
  var m=s.match(/^(D|S|M)?([1-9])$/);
  if(m) {
    var n=Number(m[2]);
    return m[1]==='S'||m[1]==='M' ? n+13 : n+3;
  }
  // Ex: GEAR5, DRIVE5: retain number when the telemetry includes a prefix.
  m=s.match(/(?:GEAR|DRIVE)([1-9])$/);
  if(m)return Number(m[1])+3;
  return 3;
}
var rpm=clamp(first(['DataCorePlugin.GameData.NewData.Rpms','Rpms'],0),0,8500);
var speed=clamp(first(['DataCorePlugin.GameData.NewData.SpeedKmh','SpeedKmh'],0),0,330);
var fuel=clamp(value(override.fuel,['DataCorePlugin.Computed.Fuel_Percent','DataCorePlugin.GameData.NewData.FuelPercent'],50),0,100);
var coolant=clamp(value(override.coolant,['DataCorePlugin.GameData.NewData.WaterTemperature','WaterTemperature'],85),-40,150);
var oil=clamp(value(override.oilTemp,['DataCorePlugin.GameData.NewData.OilTemperature','DataCorePlugin.GameRawData.Engine.OilTemperature'],90),-40,170);
var throttle=clamp(first(['DataCorePlugin.GameData.NewData.Throttle','Throttle'],0),0,100);
// Several SimHub versions express throttle as 0..1; manually override if needed.
if(throttle>0 && throttle<=1)throttle=clamp(throttle*100,0,100);
var gear=gearCode(value(override.gear,['DataCorePlugin.GameData.NewData.Gear','Gear'],'P'));
var left=b(first(['TurnIndicatorLeft','DataCorePlugin.GameData.NewData.TurnIndicatorLeft'],false));
var right=b(first(['TurnIndicatorRight','DataCorePlugin.GameData.NewData.TurnIndicatorRight'],false));
var lights=String(first(['DataCorePlugin.GameRawData.ShowLights'],'')).toUpperCase();
var high=b(value(override.high,['DataCorePlugin.GameRawData.Lights.HighBeams','HighBeam'],lights.indexOf('DL_FULLBEAM')>=0));
var low=b(value(override.low,['DataCorePlugin.GameRawData.Lights.LowBeams','LowBeam'],false));
var fog=b(value(override.fog,['DataCorePlugin.GameRawData.Lights.FogLights'],false));
// BeamNG exposes dashboard light flags as a numeric mask in some SimHub integrations.
// Numeric flags are a fallback, not a substitute for verified named properties.
var rawFlags=first(['DataCorePlugin.GameRawData.Flags','DataCorePlugin.GameRawData.DashboardLights','OutGaugeFlags'],null);
var flags=rawFlags===null ? null : Number(rawFlags);
if(!isFinite(flags)) flags=null;
var brake=b(value(override.handbrake,
  ['DataCorePlugin.GameData.NewData.Handbrake','Handbrake','DataCorePlugin.GameRawData.Electrics.parkingbrake','DataCorePlugin.GameRawData.Electrics.parkingBrake'],
  (flags!==null && (flags&4)!==0) || lights.indexOf('DL_HANDBRAKE')>=0));
var abs=b(value(override.abs,
  ['DataCorePlugin.GameData.NewData.ABSActive','ABSActive','DataCorePlugin.GameRawData.Electrics.absActive'],
  (flags!==null && (flags&0x400)!==0) || lights.indexOf('DL_ABS')>=0));
var tc=b(value(override.tc,
  ['DataCorePlugin.GameData.NewData.TCActive','TCActive','DataCorePlugin.GameRawData.Electrics.tcsActive'],
  (flags!==null && (flags&0x10)!==0) || lights.indexOf('DL_TC')>=0));
var esc=b(value(override.esc,
  ['ESCActive','DataCorePlugin.GameRawData.Electrics.escActive'],false));
var escOff=b(value(override.escOff,
  ['ESCOff','DataCorePlugin.GameRawData.Electrics.escOff','DataCorePlugin.GameRawData.Electrics.escDisabled'],false));
// ETS2/ATS use the SCS telemetry paths supplied by the user.
var cruise=b(value(override.cruise,['DataCorePlugin.GameRawData.Drivetrain.CruiseControl','CruiseControlActive'],false));
var setKmh=clamp(value(override.setSpeedKmh,['DataCorePlugin.GameRawData.Drivetrain.CruiseControlSpeedKmh','CruiseControlSpeedKmh'],0),0,330);
var driveMode=clamp(value(override.driveMode,['DataCorePlugin.GameRawData.DriveMode'],1),0,4);
var running=b(first(['DataCorePlugin.GameRunning'],false));
var ignition=clamp(value(override.ignition,[],running?2:0),0,2);
var doors=[
 b(value(override.leftDoor,['DataCorePlugin.GameRawData.Doors.FrontLeft'],false)),
 b(value(override.rightDoor,['DataCorePlugin.GameRawData.Doors.FrontRight'],false)),
 b(value(override.rearLeftDoor,['DataCorePlugin.GameRawData.Doors.RearLeft'],false)),
 b(value(override.rearRightDoor,['DataCorePlugin.GameRawData.Doors.RearRight'],false)),
 b(value(override.hood,['DataCorePlugin.GameRawData.Doors.Hood'],false)),
 b(value(override.boot,['DataCorePlugin.GameRawData.Doors.Trunk'],false))
];
var tpms=b(value(override.tpms,['TPMSWarning'],false));
var engineWarn=b(value(override.engineWarning,['EngineWarning'],false));
var speedWarn=b(value(override.speedWarning,['SpeedWarning'],false));
var hour=clamp(value(override.hour,['DataCorePlugin.GameRawData.Hour'],12),0,23);
var minute=clamp(value(override.minute,['DataCorePlugin.GameRawData.Minute'],0),0,59);
// Heartbeat ensures SimHub Arduino Custom Protocol resends even for static telemetry.
if (root.g30Heartbeat === null || root.g30Heartbeat === undefined) root.g30Heartbeat=0;
root.g30Heartbeat=(root.g30Heartbeat+1)%10000;
return ['G30',rpm,speed,fuel,coolant,oil,throttle,gear,left,right,high,low,fog,brake,
  abs,tc,esc,escOff,cruise,setKmh,driveMode,ignition,
  doors[0],doors[1],doors[2],doors[3],doors[4],doors[5],
  tpms,engineWarn,speedWarn,hour,minute,root.g30Heartbeat].join(';');

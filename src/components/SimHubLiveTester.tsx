import React, { useState, useEffect } from 'react';
import { SimHubPacket } from '../types/simhub';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Gamepad2, 
  Gauge, 
  Sliders, 
  Flame, 
  Lightbulb, 
  ShieldAlert, 
  Car,
  Zap,
  Activity,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';

interface SimHubLiveTesterProps {
  packet: SimHubPacket;
  onUpdatePacket: (partial: Partial<SimHubPacket>) => void;
  units: 'us' | 'metric';
  onSetUnits: (units: 'us' | 'metric') => void;
}

export const SimHubLiveTester: React.FC<SimHubLiveTesterProps> = ({
  packet,
  onUpdatePacket,
  units,
  onSetUnits
}) => {
  const [isSimulatingRace, setIsSimulatingRace] = useState(false);
  const [copiedPacket, setCopiedPacket] = useState(false);
  const [blinkerState, setBlinkerState] = useState(false);

  // Blinker pulse cadence (BMW standard ~1.5 Hz)
  useEffect(() => {
    if (!packet.turnL && !packet.turnR) {
      setBlinkerState(false);
      return;
    }
    const timer = setInterval(() => {
      setBlinkerState(prev => !prev);
    }, 380);
    return () => clearInterval(timer);
  }, [packet.turnL, packet.turnR]);

  // Virtual Lap Simulator (Simulates live driving telemetry from SimHub)
  useEffect(() => {
    if (!isSimulatingRace) return;

    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      const cycle = tick % 300; // 15-second virtual lap cycle

      if (cycle < 60) {
        // Hard acceleration (Gears 1 -> 2 -> 3)
        const progress = cycle / 60;
        const spd = Math.round(progress * 130);
        const gearRpm = (cycle % 20) * 350 + 1500;
        const gearNum = Math.min(4, Math.floor(cycle / 20) + 1);
        onUpdatePacket({
          speed: spd,
          rpm: gearRpm,
          gear: `${gearNum}`,
          mpg: 8.5,
          tc: cycle % 20 < 4, // Traction kick
          abs: false,
          handbrake: false
        });
      } else if (cycle < 100) {
        // High speed straight (160 - 200 km/h)
        onUpdatePacket({
          speed: 180 + Math.sin(cycle * 0.2) * 15,
          rpm: 6200 + Math.sin(cycle * 0.2) * 400,
          gear: '5',
          mpg: 14.0,
          tc: false,
          abs: false,
          handbrake: false
        });
      } else if (cycle < 160) {
        // Heavy braking into hairpin turn (ABS active!)
        const brakeProgress = (cycle - 100) / 60;
        const spd = Math.max(35, 180 - brakeProgress * 150);
        onUpdatePacket({
          speed: Math.round(spd),
          rpm: Math.max(1800, 6000 - brakeProgress * 4000),
          gear: spd > 90 ? '3' : '2',
          mpg: 45.0, // Coasting/Fuel cut
          abs: true, // ABS telltale on
          tc: false
        });
      } else if (cycle < 220) {
        // Accelerating out of turn with turn indicator
        onUpdatePacket({
          speed: 95 + (cycle - 160) * 1.5,
          rpm: 4500 + Math.sin(cycle * 0.3) * 600,
          gear: '3',
          mpg: 18.2,
          abs: false,
          tc: (cycle % 15) < 3,
          turnR: cycle < 190,
          turnL: false
        });
      } else {
        // Cruising back to straight
        onUpdatePacket({
          speed: 145,
          rpm: 4800,
          gear: '4',
          mpg: 28.0,
          abs: false,
          tc: false,
          turnR: false,
          turnL: false
        });
      }
    }, 50); // 20 Hz update loop

    return () => clearInterval(interval);
  }, [isSimulatingRace]);

  // Formatted SimHub Packet String
  const serialPacketString = `<S;${packet.speed.toFixed(1)};${Math.round(packet.rpm)};${packet.gear};${packet.mpg.toFixed(1)};${packet.waterTemp};${packet.oilTemp};${packet.lowBeam ? 1 : 0};${packet.highBeam ? 1 : 0};${packet.fogFront ? 1 : 0};${packet.fogRear ? 1 : 0};${packet.checkEngine ? 1 : 0};${packet.abs ? 1 : 0};${packet.tc ? 1 : 0};${packet.handbrake ? 1 : 0};${packet.turnL ? 1 : 0};${packet.turnR ? 1 : 0};${packet.ignition}>`;

  const handleCopyPacket = () => {
    navigator.clipboard.writeText(serialPacketString);
    setCopiedPacket(true);
    setTimeout(() => setCopiedPacket(false), 1800);
  };

  // Needle Rotations:
  // Speedometer (0-260 km/h or 0-160 mph): -125 deg to +125 deg (250 deg sweep)
  const maxSpeed = units === 'us' ? 160 : 260;
  const displaySpeed = units === 'us' ? (packet.speed * 0.621371) : packet.speed;
  const speedAngle = -125 + (Math.min(maxSpeed, Math.max(0, displaySpeed)) / maxSpeed) * 250;

  // Tachometer (0-8000 RPM): -125 deg to +125 deg
  const rpmAngle = -125 + (Math.min(8000, Math.max(0, packet.rpm)) / 8000) * 250;

  // Fuel Economy (0-50 MPG): -60 deg to +60 deg
  const ecoAngle = -60 + (Math.min(50, Math.max(0, packet.mpg)) / 50) * 120;

  const isBacklit = packet.lowBeam || packet.ignition >= 2;

  return (
    <div className="space-y-6">
      {/* Top Banner: Live SimHub Serial Packet Inspector */}
      <div className="bg-zinc-900/95 rounded-xl p-4 border border-zinc-800 shadow-xl space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              SimHub Serial Stream to Arduino Mega (115200 Baud)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulatingRace(!isSimulatingRace)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isSimulatingRace
                  ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
              }`}
            >
              {isSimulatingRace ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulatingRace ? 'Stop Race Lap' : 'Simulate Race Lap'}</span>
            </button>

            <button
              onClick={handleCopyPacket}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-950 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-all"
              title="Copy raw packet"
            >
              {copiedPacket ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedPacket ? 'Copied' : 'Copy Frame'}</span>
            </button>
          </div>
        </div>

        {/* Live Raw Serial String Display */}
        <div className="p-2.5 bg-black rounded-lg border border-zinc-800/80 font-mono text-xs overflow-x-auto select-all">
          <span className="text-zinc-500 mr-2">TX &gt;</span>
          <span className="text-emerald-400 font-bold">{serialPacketString}</span>
        </div>
      </div>

      {/* Virtual BMW E90 Instrument Cluster Graphic */}
      <div className="relative mx-auto max-w-4xl rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4 sm:p-6 shadow-[inset_0_2px_20px_rgba(0,0,0,0.9),0_10px_30px_rgba(0,0,0,0.8)] border-4 border-zinc-800/70 select-none">
        
        {/* Telltale Indicators Bar */}
        <div className="flex items-center justify-between px-6 sm:px-12 mb-3 h-8 bg-zinc-950/80 rounded-lg border border-zinc-900 shadow-inner">
          {/* Left Blinker */}
          <div className={`transition-opacity duration-100 ${packet.turnL && blinkerState ? 'opacity-100 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'opacity-15 text-zinc-700'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 7l-5 5 5 5V7z" />
            </svg>
          </div>

          {/* Central Telltales */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Low Beam */}
            <div 
              title="Low Beam Headlights"
              className={`transition-all ${packet.lowBeam ? 'opacity-100 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'opacity-15 text-zinc-700'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            </div>

            {/* High Beam (Blue) */}
            <div 
              title="High Beam (Blue Tell-tale)"
              className={`transition-all ${packet.highBeam ? 'opacity-100 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,1)]' : 'opacity-15 text-zinc-700'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm-1 14H8v-2h3v2zm0-4H7v-2h4v2zm0-4H8V7h3v2zm6 8h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2z" />
              </svg>
            </div>

            {/* Front Fog (Green) */}
            <div 
              title="Front Fog Lamps"
              className={`transition-all ${packet.fogFront ? 'opacity-100 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'opacity-15 text-zinc-700'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 8h5M4 12h5M4 16h5M13 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5" />
                <path d="M2 19l20 0" strokeDasharray="2 3" />
              </svg>
            </div>

            {/* Rear Fog (Amber) */}
            <div 
              title="Rear Fog Lamp"
              className={`transition-all ${packet.fogRear ? 'opacity-100 text-amber-500 drop-shadow-[0_0_7px_rgba(245,158,11,0.9)]' : 'opacity-15 text-zinc-700'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M11 7a5 5 0 0 0-5 5 5 5 0 0 0 5 5" />
                <path d="M15 8h5M15 12h5M15 16h5" />
              </svg>
            </div>

            {/* Check Engine Light / MIL (Amber) */}
            <div 
              title="Check Engine / MIL / Engine Fault"
              className={`transition-all ${packet.checkEngine ? 'opacity-100 text-amber-500 drop-shadow-[0_0_9px_rgba(245,158,11,1)] animate-pulse' : 'opacity-15 text-zinc-700'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 13h-2V9a1 1 0 0 0-1-1h-3V6a1 1 0 0 0-1-1h-2V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2H6a1 1 0 0 0-1 1v2H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v3a1 1 0 0 0 1 1h2v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2h2a1 1 0 0 0 1-1v-3h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z" />
              </svg>
            </div>

            {/* Handbrake */}
            <div 
              title="Handbrake"
              className={`transition-all ${packet.handbrake ? 'opacity-100 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'opacity-15 text-zinc-700'}`}
            >
              <span className="font-bold font-mono text-[11px] px-1 py-0.2 rounded border border-current">BRAKE</span>
            </div>

            {/* ABS Active */}
            <div 
              title="ABS Warning"
              className={`transition-all ${packet.abs ? 'opacity-100 text-amber-500 drop-shadow-[0_0_7px_rgba(245,158,11,0.9)] animate-pulse' : 'opacity-15 text-zinc-700'}`}
            >
              <span className="font-bold font-mono text-[10px] px-1 py-0.2 rounded border border-current">ABS</span>
            </div>

            {/* TC Active */}
            <div 
              title="Traction Control / DTC"
              className={`transition-all ${packet.tc ? 'opacity-100 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse' : 'opacity-15 text-zinc-700'}`}
            >
              <span className="font-bold font-mono text-[10px] px-1 py-0.2 rounded border border-current">DTC</span>
            </div>
          </div>

          {/* Right Blinker */}
          <div className={`transition-opacity duration-100 ${packet.turnR && blinkerState ? 'opacity-100 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'opacity-15 text-zinc-700'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 17l5-5-5-5v10z" />
            </svg>
          </div>
        </div>

        {/* Main Gauges Display */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* SPEEDOMETER GAUGE */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-black p-2 border-4 border-zinc-700 shadow-2xl">
              <svg className="w-full h-full" viewBox="0 0 300 300">
                <circle cx="150" cy="150" r="138" fill="#09090b" stroke="#27272a" strokeWidth="2" />
                {Array.from({ length: 17 }).map((_, i) => {
                  const val = units === 'us' ? i * 10 : i * (260 / 16);
                  const angleDeg = -125 + (i / 16) * 250;
                  const angleRad = (angleDeg - 90) * (Math.PI / 180);
                  const isMajor = i % 2 === 0;
                  const x1 = 150 + 132 * Math.cos(angleRad);
                  const y1 = 150 + 132 * Math.sin(angleRad);
                  const x2 = 150 + (isMajor ? 116 : 124) * Math.cos(angleRad);
                  const y2 = 150 + (isMajor ? 116 : 124) * Math.sin(angleRad);
                  const tx = 150 + 98 * Math.cos(angleRad);
                  const ty = 150 + 98 * Math.sin(angleRad) + 5;

                  return (
                    <g key={i}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isBacklit ? '#fb923c' : '#71717a'} strokeWidth={isMajor ? 2.5 : 1.2} />
                      {isMajor && (
                        <text x={tx} y={ty} textAnchor="middle" fontSize="13" fontWeight="700" fill={isBacklit ? '#fed7aa' : '#a1a1aa'}>
                          {Math.round(val)}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x="150" y="190" textAnchor="middle" fontSize="12" fontWeight="600" fontFamily="monospace" fill={isBacklit ? '#fb923c' : '#71717a'}>
                  {units === 'us' ? 'MPH' : 'km/h'}
                </text>
                {/* Needle */}
                <g transform={`rotate(${speedAngle}, 150, 150)`} className="transition-transform duration-100 ease-out origin-center">
                  <line x1="150" y1="165" x2="150" y2="28" stroke="#f97316" strokeWidth="3.2" strokeLinecap="round" />
                  <circle cx="150" cy="150" r="18" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                </g>
              </svg>
            </div>
            <span className="mt-2 text-xs font-mono text-zinc-400">
              SIM SPEED: {Math.round(displaySpeed)} {units === 'us' ? 'MPH' : 'km/h'}
            </span>
          </div>

          {/* CENTER LCD DISPLAY */}
          <div className="md:col-span-2 flex flex-col items-center justify-center my-2">
            <div className="w-full max-w-[190px] h-48 rounded-lg bg-zinc-950 p-2.5 border-2 border-zinc-800 shadow-[inset_0_2px_10px_rgba(0,0,0,0.95)] flex flex-col justify-between overflow-hidden relative">
              <div className="absolute inset-0 bg-amber-950/30 pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between text-[11px] font-mono border-b border-amber-900/40 pb-1 text-amber-400">
                <span>+{packet.waterTemp}°C</span>
                <span className="font-bold">GEAR: {packet.gear}</span>
              </div>

              <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center">
                <span className="text-amber-500 text-[10px] font-mono tracking-tight">SIMHUB TELEMETRY</span>
                <span className="text-amber-400 font-bold font-mono text-3xl tracking-tight my-1">
                  {packet.gear}
                </span>
                <span className="text-amber-300 text-[11px] font-mono">
                  {Math.round(packet.speed)} km/h
                </span>
              </div>

              <div className="relative z-10 flex flex-col border-t border-amber-900/40 pt-1 text-[10px] font-mono text-amber-400">
                <div className="flex justify-between">
                  <span className="text-amber-600">OIL:</span>
                  <span>{packet.oilTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600">ECON:</span>
                  <span>{packet.mpg.toFixed(1)} mpg</span>
                </div>
              </div>
            </div>
            <span className="mt-2 text-[10px] font-mono text-zinc-500">BMW E90 KOMBI LCD</span>
          </div>

          {/* TACHOMETER & MPG GAUGE */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-black p-2 border-4 border-zinc-700 shadow-2xl">
              <svg className="w-full h-full" viewBox="0 0 300 300">
                <circle cx="150" cy="150" r="138" fill="#09090b" stroke="#27272a" strokeWidth="2" />
                {Array.from({ length: 9 }).map((_, i) => {
                  const angleDeg = -125 + (i / 8) * 250;
                  const angleRad = (angleDeg - 90) * (Math.PI / 180);
                  const isRedline = i >= 7;
                  const x1 = 150 + 132 * Math.cos(angleRad);
                  const y1 = 150 + 132 * Math.sin(angleRad);
                  const x2 = 150 + 116 * Math.cos(angleRad);
                  const y2 = 150 + 116 * Math.sin(angleRad);
                  const tx = 150 + 98 * Math.cos(angleRad);
                  const ty = 150 + 98 * Math.sin(angleRad) + 5;

                  return (
                    <g key={i}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isRedline ? '#ef4444' : (isBacklit ? '#fb923c' : '#71717a')} strokeWidth={isRedline ? 3.5 : 2.5} />
                      <text x={tx} y={ty} textAnchor="middle" fontSize="14" fontWeight="700" fill={isRedline ? '#f87171' : (isBacklit ? '#fed7aa' : '#a1a1aa')}>
                        {i}
                      </text>
                    </g>
                  );
                })}
                <text x="150" y="120" textAnchor="middle" fontSize="11" fontWeight="600" fontFamily="monospace" fill={isBacklit ? '#fb923c' : '#71717a'}>
                  1/min x 1000
                </text>

                {/* Sub-Dial: Instantaneous Fuel Economy (MPG) */}
                <g transform="translate(0, 50)">
                  <path d="M 100 170 A 60 60 0 0 1 200 170" fill="none" stroke="#1c1917" strokeWidth="12" />
                  {[0, 15, 25, 35, 50].map((v, idx) => {
                    const subDeg = -60 + (v / 50) * 120;
                    const subRad = (subDeg - 90) * (Math.PI / 180);
                    return (
                      <line
                        key={idx}
                        x1={150 + 58 * Math.cos(subRad)}
                        y1={170 + 58 * Math.sin(subRad)}
                        x2={150 + 50 * Math.cos(subRad)}
                        y2={170 + 50 * Math.sin(subRad)}
                        stroke={isBacklit ? '#fb923c' : '#71717a'}
                        strokeWidth="1.5"
                      />
                    );
                  })}
                  <text x="150" y="182" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily="monospace" fill={isBacklit ? '#ea580c' : '#52525b'}>
                    MPG (0x349)
                  </text>
                  <g transform={`rotate(${ecoAngle}, 150, 170)`} className="transition-transform duration-100 ease-out origin-center">
                    <line x1="150" y1="170" x2="150" y2="120" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="150" cy="170" r="5" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                  </g>
                </g>

                {/* Main Tachometer Needle */}
                <g transform={`rotate(${rpmAngle}, 150, 150)`} className="transition-transform duration-100 ease-out origin-center">
                  <line x1="150" y1="165" x2="150" y2="28" stroke="#f97316" strokeWidth="3.2" strokeLinecap="round" />
                  <circle cx="150" cy="150" r="18" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                </g>
              </svg>
            </div>
            <span className="mt-2 text-xs font-mono text-zinc-400">
              SIM RPM: {Math.round(packet.rpm)} RPM
            </span>
          </div>

        </div>
      </div>

      {/* Manual Sliders & Toggles Panel */}
      <div className="bg-zinc-900/90 rounded-xl p-5 border border-zinc-800 shadow-md">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            Manual Telemetry Overrides
          </h3>
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => onSetUnits('us')}
              className={`px-2 py-0.5 rounded ${units === 'us' ? 'bg-amber-600 text-white' : 'text-zinc-400'}`}
            >
              MPH
            </button>
            <button
              onClick={() => onSetUnits('metric')}
              className={`px-2 py-0.5 rounded ${units === 'metric' ? 'bg-amber-600 text-white' : 'text-zinc-400'}`}
            >
              KM/H
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Speed Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-300">SPEED</span>
              <span className="text-amber-400 font-bold">{Math.round(displaySpeed)} {units === 'us' ? 'MPH' : 'km/h'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="260"
              value={packet.speed}
              onChange={(e) => onUpdatePacket({ speed: parseFloat(e.target.value) })}
              className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* RPM Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-300">ENGINE RPM</span>
              <span className="text-amber-400 font-bold">{Math.round(packet.rpm)} RPM</span>
            </div>
            <input
              type="range"
              min="0"
              max="8000"
              step="50"
              value={packet.rpm}
              onChange={(e) => onUpdatePacket({ rpm: parseFloat(e.target.value) })}
              className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Fuel Economy Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-300">FUEL CONSUMPTION (MPG)</span>
              <span className="text-amber-400 font-bold">{packet.mpg.toFixed(1)} MPG</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={packet.mpg}
              onChange={(e) => onUpdatePacket({ mpg: parseFloat(e.target.value) })}
              className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        {/* Telltale Toggles */}
        <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            onClick={() => onUpdatePacket({ lowBeam: !packet.lowBeam })}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              packet.lowBeam ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            Low Beam
          </button>

          <button
            onClick={() => onUpdatePacket({ highBeam: !packet.highBeam })}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              packet.highBeam ? 'bg-blue-950 text-blue-300 border-blue-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            High Beam
          </button>

          <button
            onClick={() => onUpdatePacket({ fogFront: !packet.fogFront })}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              packet.fogFront ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            Front Fog
          </button>

          <button
            onClick={() => onUpdatePacket({ fogRear: !packet.fogRear })}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              packet.fogRear ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            Rear Fog
          </button>

          <button
            onClick={() => onUpdatePacket({ checkEngine: !packet.checkEngine })}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              packet.checkEngine ? 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            Check Engine
          </button>

          <button
            onClick={() => onUpdatePacket({ abs: !packet.abs })}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              packet.abs ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            ABS Warning
          </button>

          <button
            onClick={() => onUpdatePacket({ tc: !packet.tc })}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              packet.tc ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            Traction (DTC)
          </button>

          <button
            onClick={() => onUpdatePacket({ handbrake: !packet.handbrake })}
            className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
              packet.handbrake ? 'bg-red-950 text-red-300 border-red-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            Handbrake
          </button>
        </div>
      </div>
    </div>
  );
};

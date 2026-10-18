import React, { useState, useEffect } from 'react';
import { SimHubPacket } from '../types/simhub';
import { Play, Pause, Activity, Copy, Check, RotateCcw, AlertTriangle } from 'lucide-react';

interface AstonMartinClusterSimulatorProps {
  packet: SimHubPacket;
  onUpdatePacket: (partial: Partial<SimHubPacket>) => void;
  units: 'us' | 'metric';
  onSetUnits: (units: 'us' | 'metric') => void;
}

export const AstonMartinClusterSimulator: React.FC<AstonMartinClusterSimulatorProps> = ({
  packet,
  onUpdatePacket,
  units,
  onSetUnits
}) => {
  const [blinkerState, setBlinkerState] = useState(false);
  const [isLapping, setIsLapping] = useState(false);

  useEffect(() => {
    if (!packet.turnL && !packet.turnR) {
      setBlinkerState(false);
      return;
    }
    const timer = setInterval(() => setBlinkerState(prev => !prev), 380);
    return () => clearInterval(timer);
  }, [packet.turnL, packet.turnR]);

  // Aston Martin Speed Needle: Clockwise 0 to 330 km/h (or 200 mph)
  // Sweep: -125 deg to +125 deg
  const maxSpeed = units === 'us' ? 200 : 330;
  const displaySpeed = units === 'us' ? packet.speed * 0.621371 : packet.speed;
  const speedAngle = -125 + (Math.min(maxSpeed, Math.max(0, displaySpeed)) / maxSpeed) * 250;

  // IMPORTANT ASTON MARTIN SIGNATURE:
  // TACHOMETER SWEEPS COUNTER-CLOCKWISE (Anti-Clockwise)!
  // 0 RPM starts at +125 deg (bottom right) and sweeps to -125 deg (bottom left) as RPM increases to 8000!
  const rpmRatio = Math.min(8000, Math.max(0, packet.rpm)) / 8000;
  const rpmCounterClockwiseAngle = 125 - rpmRatio * 250;

  const isBacklit = packet.lowBeam || packet.ignition >= 2;

  return (
    <div className="relative w-full rounded-2xl bg-zinc-950 p-4 sm:p-6 shadow-2xl border border-zinc-800/80 overflow-hidden select-none">
      {/* Cool Ice-Blue/Silver Glow */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: isBacklit 
            ? 'radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.12) 0%, rgba(14, 165, 233, 0.04) 50%, transparent 80%)'
            : 'none'
        }}
      />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse shadow-sm shadow-sky-400/50" />
          <h2 className="text-sm font-semibold tracking-wider text-zinc-200 uppercase flex items-center gap-1.5">
            Aston Martin DB9 / Vantage Cluster
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-zinc-800 text-sky-400 border border-sky-500/30">
              Volvo PAG MS-CAN 125kbps / HS-CAN 500kbps
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
            <span className="text-zinc-500 mr-1.5">TACHOMETER:</span>
            <span className="text-sky-300 font-semibold uppercase">Counter-Clockwise Sweep</span>
          </span>
        </div>
      </div>

      {/* Brushed Aluminum DB9 Gauge Housing */}
      <div className="relative mx-auto max-w-4xl rounded-2xl bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 p-4 sm:p-6 shadow-[inset_0_2px_20px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.9)] border-4 border-zinc-600/60">
        
        {/* Telltale Indicators Bar */}
        <div className="flex items-center justify-between px-6 sm:px-12 mb-4 h-8 bg-zinc-950/90 rounded-lg border border-zinc-800 shadow-inner">
          {/* Left Blinker */}
          <div className={`transition-opacity duration-100 ${packet.turnL && blinkerState ? 'opacity-100 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'opacity-15 text-zinc-700'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 7l-5 5 5 5V7z" />
            </svg>
          </div>

          {/* Central Telltales */}
          <div className="flex items-center gap-4">
            {/* Low Beam */}
            <div className={`transition-all ${packet.lowBeam ? 'opacity-100 text-emerald-400' : 'opacity-15 text-zinc-700'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            </div>

            {/* High Beam (Blue) */}
            <div className={`transition-all ${packet.highBeam ? 'opacity-100 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,1)]' : 'opacity-15 text-zinc-700'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm-1 14H8v-2h3v2zm0-4H7v-2h4v2zm0-4H8V7h3v2zm6 8h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2z" />
              </svg>
            </div>

            {/* Front Fog */}
            <div className={`transition-all ${packet.fogFront ? 'opacity-100 text-emerald-400' : 'opacity-15 text-zinc-700'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 8h5M4 12h5M4 16h5M13 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5" />
                <path d="M2 19l20 0" strokeDasharray="2 3" />
              </svg>
            </div>

            {/* Check Engine (MIL) */}
            <div className={`transition-all ${packet.checkEngine ? 'opacity-100 text-amber-500 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,1)]' : 'opacity-15 text-zinc-700'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 13h-2V9a1 1 0 0 0-1-1h-3V6a1 1 0 0 0-1-1h-2V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2H6a1 1 0 0 0-1 1v2H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v3a1 1 0 0 0 1 1h2v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2h2a1 1 0 0 0 1-1v-3h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z" />
              </svg>
            </div>

            {/* Handbrake */}
            <div className={`transition-all ${packet.handbrake ? 'opacity-100 text-red-500' : 'opacity-15 text-zinc-700'}`}>
              <span className="font-bold font-mono text-[11px] px-1 py-0.2 rounded border border-current">BRAKE</span>
            </div>

            {/* ABS */}
            <div className={`transition-all ${packet.abs ? 'opacity-100 text-amber-500' : 'opacity-15 text-zinc-700'}`}>
              <span className="font-bold font-mono text-[10px] px-1 py-0.2 rounded border border-current">ABS</span>
            </div>

            {/* TC */}
            <div className={`transition-all ${packet.tc ? 'opacity-100 text-amber-500' : 'opacity-15 text-zinc-700'}`}>
              <span className="font-bold font-mono text-[10px] px-1 py-0.2 rounded border border-current">DSC</span>
            </div>
          </div>

          {/* Right Blinker */}
          <div className={`transition-opacity duration-100 ${packet.turnR && blinkerState ? 'opacity-100 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'opacity-15 text-zinc-700'}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 17l5-5-5-5v10z" />
            </svg>
          </div>
        </div>

        {/* Dual Machined Aluminum Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* LEFT GAUGE: SPEEDOMETER (Clockwise) */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-900 p-2 border-4 border-zinc-500 shadow-2xl">
              <div className="absolute inset-2 rounded-full border border-zinc-400/30 pointer-events-none" />

              <svg className="w-full h-full" viewBox="0 0 300 300">
                <circle cx="150" cy="150" r="138" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                
                {/* Speedometer ticks (0 to 200 MPH or 330 km/h) */}
                {Array.from({ length: 11 }).map((_, i) => {
                  const val = units === 'us' ? i * 20 : i * 33;
                  const angleDeg = -125 + (i / 10) * 250;
                  const angleRad = (angleDeg - 90) * (Math.PI / 180);
                  const x1 = 150 + 132 * Math.cos(angleRad);
                  const y1 = 150 + 132 * Math.sin(angleRad);
                  const x2 = 150 + 116 * Math.cos(angleRad);
                  const y2 = 150 + 116 * Math.sin(angleRad);
                  const tx = 150 + 96 * Math.cos(angleRad);
                  const ty = 150 + 96 * Math.sin(angleRad) + 5;

                  return (
                    <g key={i}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isBacklit ? '#e0f2fe' : '#71717a'} strokeWidth="2.5" />
                      <text x={tx} y={ty} textAnchor="middle" fontSize="13" fontWeight="bold" fontFamily="sans-serif" fill={isBacklit ? '#f0f9ff' : '#a1a1aa'}>
                        {Math.round(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Aston Martin Script Label */}
                <text x="150" y="195" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="2" fill={isBacklit ? '#38bdf8' : '#71717a'}>
                  {units === 'us' ? 'MPH' : 'KM/H'}
                </text>

                {/* Red Needle */}
                <g transform={`rotate(${speedAngle}, 150, 150)`} className="transition-transform duration-100 ease-out origin-center">
                  <line x1="150" y1="165" x2="150" y2="28" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="150" cy="150" r="16" fill="#09090b" stroke="#71717a" strokeWidth="2" />
                </g>
              </svg>
            </div>
            
            {/* Left Lower Digital Screen: Gear & Digital Speed */}
            <div className="mt-3 w-56 p-2 rounded-lg bg-black border border-zinc-800 text-center font-mono">
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>GEAR</span>
                <span>SPEED</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold text-sky-400">
                <span className="text-2xl text-amber-400">{packet.gear}</span>
                <span>{Math.round(displaySpeed)} <span className="text-xs text-zinc-400">{units === 'us' ? 'mph' : 'km/h'}</span></span>
              </div>
            </div>
          </div>

          {/* RIGHT GAUGE: TACHOMETER (Counter-Clockwise Sweep!) */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-900 p-2 border-4 border-zinc-500 shadow-2xl">
              <div className="absolute inset-2 rounded-full border border-zinc-400/30 pointer-events-none" />

              <svg className="w-full h-full" viewBox="0 0 300 300">
                <circle cx="150" cy="150" r="138" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />

                {/* Counter-Clockwise Tachometer Scale (0 on Right, 8 on Left!) */}
                {Array.from({ length: 9 }).map((_, i) => {
                  // i goes from 0 to 8 x 1000 RPM
                  // 0 is at +125 deg, 8 is at -125 deg!
                  const angleDeg = 125 - (i / 8) * 250;
                  const angleRad = (angleDeg - 90) * (Math.PI / 180);
                  const isRedline = i >= 7;
                  const x1 = 150 + 132 * Math.cos(angleRad);
                  const y1 = 150 + 132 * Math.sin(angleRad);
                  const x2 = 150 + 116 * Math.cos(angleRad);
                  const y2 = 150 + 116 * Math.sin(angleRad);
                  const tx = 150 + 96 * Math.cos(angleRad);
                  const ty = 150 + 96 * Math.sin(angleRad) + 5;

                  return (
                    <g key={i}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isRedline ? '#ef4444' : (isBacklit ? '#e0f2fe' : '#71717a')} strokeWidth={isRedline ? 3.5 : 2.5} />
                      <text x={tx} y={ty} textAnchor="middle" fontSize="14" fontWeight="bold" fontFamily="sans-serif" fill={isRedline ? '#f87171' : (isBacklit ? '#f0f9ff' : '#a1a1aa')}>
                        {i}
                      </text>
                    </g>
                  );
                })}

                <text x="150" y="195" textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="1.5" fill={isBacklit ? '#38bdf8' : '#71717a'}>
                  RPM x 1000 (REV)
                </text>

                {/* Counter-Clockwise Needle */}
                <g transform={`rotate(${rpmCounterClockwiseAngle}, 150, 150)`} className="transition-transform duration-100 ease-out origin-center">
                  <line x1="150" y1="165" x2="150" y2="28" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="150" cy="150" r="16" fill="#09090b" stroke="#71717a" strokeWidth="2" />
                </g>
              </svg>
            </div>

            {/* Right Lower Digital Screen: POWER, BEAUTY, SOUL & Temps */}
            <div className="mt-3 w-56 p-2 rounded-lg bg-black border border-zinc-800 text-center font-mono">
              <div className="text-[10px] tracking-widest text-sky-400 font-bold uppercase animate-pulse">
                POWER, BEAUTY, SOUL
              </div>
              <div className="flex justify-between items-center text-xs mt-1 text-zinc-300 font-mono">
                <span>WATER: <strong className="text-sky-300">{packet.waterTemp}°C</strong></span>
                <span>OIL: <strong className="text-sky-300">{packet.oilTemp}°C</strong></span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

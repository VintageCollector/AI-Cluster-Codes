import React, { useState } from 'react';
import { SimHubPacket, ArduinoHardwareConfig } from './types/simhub';
import { generateAstonMartinArduinoSketch } from './utils/astonMartinArduinoCode';
import { AstonMartinClusterSimulator } from './components/AstonMartinClusterSimulator';
import { SimHubSetupGuide } from './components/SimHubSetupGuide';
import { 
  Gamepad2, 
  Code, 
  Cpu, 
  Download, 
  Copy, 
  Check, 
  Settings2, 
  Gauge, 
  Activity,
  Layers,
  FileCode,
  FileJson,
  PackageCheck,
  CheckCircle2,
  Sliders
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'code' | 'simulator' | 'simhub_guide' | 'wiring'>('code');
  const [units, setUnits] = useState<'us' | 'metric'>('us');
  const [copiedCode, setCopiedCode] = useState(false);

  // SimHub Live Packet State for Aston Martin DB9
  const [packet, setPacket] = useState<SimHubPacket>({
    speed: 125.0, // km/h (~78 mph)
    rpm: 4200,    // Sweeps counter-clockwise!
    gear: '4',
    mpg: 22.5,
    waterTemp: 90,
    oilTemp: 95,
    lowBeam: true,
    highBeam: false,
    fogFront: false,
    fogRear: false,
    checkEngine: false,
    abs: false,
    tc: false,
    handbrake: false,
    turnL: false,
    turnR: false,
    fuelLevel: 70,
    ignition: 2
  });

  // Hardware Settings configured specifically for Seeed Studio CAN-BUS Shield
  const [hardwareConfig, setHardwareConfig] = useState<ArduinoHardwareConfig>({
    mcpClock: '16MHz', // Seeed CAN-BUS shield has a 16MHz crystal
    csPin: 10,        // Seeed CAN-BUS shield hardwired CS pin is 10
    canSpeed: '100kbps', // Handled as CAN_125KBPS in the Aston Martin sketch
    baudRate: 115200,
    enableBacklightWithLights: true
  });

  const sketchCode = generateAstonMartinArduinoSketch(hardwareConfig);
  const inoFilename = 'Aston_Martin_DB9_SimHub_Bridge.ino';

  const handleUpdatePacket = (partial: Partial<SimHubPacket>) => {
    setPacket(prev => ({ ...prev, ...partial }));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sketchCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const triggerDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadIno = () => {
    triggerDownload(inoFilename, sketchCode, 'text/plain;charset=utf-8');
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-sky-500 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Aston Martin Winged Badge Style Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-900 to-zinc-800 border border-zinc-700 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4c-5 0-9 4-9 8s4 8 9 8 9-4 9-8-4-8-9-8z" />
                <path d="M3 12h18" />
                <path d="M12 4v16" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                  Aston Martin DB9 CAN Bridge <span className="text-sky-400">&bull; SimHub Edition</span>
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-sky-300 border border-zinc-700">
                  Seeed Shield (CS: 10)
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Volvo PAG Platform Architecture &bull; Anti-Clockwise Tachometer &bull; Arduino Mega 2560
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadIno}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .ino Sketch</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-zinc-900 py-1.5 scrollbar-none">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'code'
                ? 'bg-zinc-800 text-sky-400 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Arduino Mega Code (.ino)</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'simulator'
                ? 'bg-zinc-800 text-sky-400 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>DB9 Cluster Simulator &amp; Tester</span>
          </button>

          <button
            onClick={() => setActiveTab('simhub_guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'simhub_guide'
                ? 'bg-zinc-800 text-sky-400 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>SimHub Setup &amp; Expressions</span>
          </button>

          <button
            onClick={() => setActiveTab('wiring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'wiring'
                ? 'bg-zinc-800 text-sky-400 border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Wiring (Volvo 16-Pin Harness)</span>
          </button>
        </div>
      </header>

      {/* Persistent Download Hub Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-sky-950/40 to-zinc-900 border-b border-zinc-800 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-zinc-200">
              Aston Martin DB9 Files Ready for Flashing:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/Aston_Martin_DB9_SimHub_Bridge.ino"
              download="Aston_Martin_DB9_SimHub_Bridge.ino"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-sky-300 border border-zinc-700 transition-all shadow-sm"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Aston_Martin_DB9_SimHub_Bridge.ino</span>
            </a>

            <a
              href="/SimHub_Aston_Martin_DB9_Profile.json"
              download="SimHub_Aston_Martin_DB9_Profile.json"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 transition-all shadow-sm"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>SimHub_Aston_Martin_DB9_Profile.json</span>
            </a>

            <a
              href="/Aston_Martin_DB9_CAN_Defs.h"
              download="Aston_Martin_DB9_CAN_Defs.h"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Aston_Martin_DB9_CAN_Defs.h</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* TAB 1: ARDUINO MEGA SKETCH (DEFAULT) */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            {/* Architecture Overview */}
            <div className="p-4 bg-sky-950/25 border border-sky-800/40 rounded-xl space-y-2 text-xs text-zinc-300">
              <span className="font-bold text-sky-300 text-sm block">
                Aston Martin DB9 &amp; Volvo PAG Platform Technical Summary:
              </span>
              <p className="leading-relaxed">
                During the Ford PAG era, the Aston Martin DB9, DBS, and V8 Vantage shared their Central Electronic Module (CEM) and Driver Information Module (DIM) network with the <strong>Volvo P1/P2 platform</strong>. This clean sketch communicates using Volvo CAN frames (<strong>0x020 CEM Wakeup</strong>, <strong>0x201 RPM</strong>, <strong>0x420 Speed</strong>, <strong>0x212 Lights</strong>, and <strong>0x320 Stability/Brakes</strong>). It is pre-configured for the <strong>Seeed Studio CAN-BUS Shield on CS Pin 10 with a 16 MHz crystal</strong>.
              </p>
            </div>

            {/* Code Box */}
            <div className="bg-zinc-900/90 rounded-xl border border-zinc-800 shadow-md overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 px-4 py-3 border-b border-zinc-800">
                <span className="font-mono text-xs font-bold text-sky-400">
                  {inoFilename} &bull; Seeed Shield (CS: 10, 16MHz)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>

                  <button
                    onClick={handleDownloadIno}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .ino File</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-zinc-950 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[600px] select-all">
                {sketchCode}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: SIMULATOR & TESTER */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <AstonMartinClusterSimulator
              packet={packet}
              onUpdatePacket={handleUpdatePacket}
              units={units}
              onSetUnits={setUnits}
            />

            {/* Manual Controls Panel */}
            <div className="bg-zinc-900/90 rounded-xl p-5 border border-zinc-800 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  Live SimHub Telemetry Sliders
                </h3>
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
                  <button
                    onClick={() => setUnits('us')}
                    className={`px-2 py-0.5 rounded ${units === 'us' ? 'bg-sky-600 text-white' : 'text-zinc-400'}`}
                  >
                    MPH
                  </button>
                  <button
                    onClick={() => setUnits('metric')}
                    className={`px-2 py-0.5 rounded ${units === 'metric' ? 'bg-sky-600 text-white' : 'text-zinc-400'}`}
                  >
                    KM/H
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-300">SPEED (0x420)</span>
                    <span className="text-sky-400 font-bold">{Math.round(units === 'us' ? packet.speed * 0.621371 : packet.speed)} {units === 'us' ? 'MPH' : 'km/h'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="330"
                    value={packet.speed}
                    onChange={(e) => handleUpdatePacket({ speed: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-300">TACHOMETER RPM (0x201 - Anti-Clockwise)</span>
                    <span className="text-sky-400 font-bold">{Math.round(packet.rpm)} RPM</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8000"
                    step="50"
                    value={packet.rpm}
                    onChange={(e) => handleUpdatePacket({ rpm: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <button
                  onClick={() => handleUpdatePacket({ lowBeam: !packet.lowBeam })}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    packet.lowBeam ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Low Beam
                </button>
                <button
                  onClick={() => handleUpdatePacket({ highBeam: !packet.highBeam })}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    packet.highBeam ? 'bg-blue-950 text-blue-300 border-blue-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  High Beam
                </button>
                <button
                  onClick={() => handleUpdatePacket({ fogFront: !packet.fogFront })}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    packet.fogFront ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Front Fog
                </button>
                <button
                  onClick={() => handleUpdatePacket({ fogRear: !packet.fogRear })}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    packet.fogRear ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Rear Fog
                </button>
                <button
                  onClick={() => handleUpdatePacket({ checkEngine: !packet.checkEngine })}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    packet.checkEngine ? 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Check Engine
                </button>
                <button
                  onClick={() => handleUpdatePacket({ abs: !packet.abs })}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    packet.abs ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  ABS
                </button>
                <button
                  onClick={() => handleUpdatePacket({ tc: !packet.tc })}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    packet.tc ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  DSC
                </button>
                <button
                  onClick={() => handleUpdatePacket({ handbrake: !packet.handbrake })}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    packet.handbrake ? 'bg-red-950 text-red-300 border-red-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Brake (!)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SIMHUB SETUP */}
        {activeTab === 'simhub_guide' && (
          <SimHubSetupGuide config={hardwareConfig} />
        )}

        {/* TAB 4: WIRING */}
        {activeTab === 'wiring' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/90 rounded-xl p-5 border border-zinc-800 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                Aston Martin DB9 &bull; Volvo 16-Pin Harness Connector Pinout
              </h3>
              <p className="text-xs text-zinc-400">
                Connect the 12V bench power supply and the Seeed CAN-BUS shield to the 16-pin connector on the rear of the DB9 instrument cluster:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3 text-left">PIN #</th>
                      <th className="py-2.5 px-3 text-left">SIGNAL NAME</th>
                      <th className="py-2.5 px-3 text-left">VOLVO / ASTON WIRE COLOR</th>
                      <th className="py-2.5 px-3 text-left">BENCH CONNECTION DESTINATION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    <tr className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 font-bold text-red-400">Pin 1</td>
                      <td className="py-2.5 px-3 font-semibold">VBAT (+12V Constant Power)</td>
                      <td className="py-2.5 px-3">Red / White or Violet</td>
                      <td className="py-2.5 px-3 text-red-300">+12V DC (from 12V 2A Power Supply)</td>
                    </tr>
                    <tr className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 font-bold text-zinc-300">Pin 16</td>
                      <td className="py-2.5 px-3 font-semibold">GND (Chassis Ground)</td>
                      <td className="py-2.5 px-3">Black or Brown</td>
                      <td className="py-2.5 px-3 text-zinc-300">Power Supply GND AND Arduino Mega GND</td>
                    </tr>
                    <tr className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 font-bold text-sky-400">Pin 10</td>
                      <td className="py-2.5 px-3 font-semibold">CAN_High (MS-CAN H)</td>
                      <td className="py-2.5 px-3">White</td>
                      <td className="py-2.5 px-3 text-sky-300">Seeed Shield CANH Screw Terminal</td>
                    </tr>
                    <tr className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 font-bold text-emerald-400">Pin 11</td>
                      <td className="py-2.5 px-3 font-semibold">CAN_Low (MS-CAN L)</td>
                      <td className="py-2.5 px-3">Green</td>
                      <td className="py-2.5 px-3 text-emerald-300">Seeed Shield CANL Screw Terminal</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Seeed Studio Shield Details */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 text-xs text-zinc-300">
                <span className="font-bold text-sky-300 text-xs block">
                  Seeed Studio CAN-BUS Shield on Arduino Mega 2560:
                </span>
                <ul className="space-y-1 list-disc list-inside text-zinc-400">
                  <li><strong>CS Pin:</strong> Pin 10 (<code className="text-sky-300 font-mono">const int CAN_CS_PIN = 10;</code>).</li>
                  <li><strong>Crystal:</strong> 16 MHz (<code className="text-sky-300 font-mono">MCP_16MHZ</code>).</li>
                  <li><strong>Bus Baud Rate:</strong> 125 kbps (<code className="text-sky-300 font-mono">CAN_125KBPS</code> for Volvo/Aston Martin MS-CAN interior network).</li>
                  <li><strong>SPI Connection:</strong> The shield stacks onto the Arduino Mega 2560 and connects to the 6-pin male ICSP header on the Mega, providing hardware SPI lines (Pins 50 MISO, 51 MOSI, 52 SCK).</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

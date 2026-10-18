import React, { useState } from 'react';
import { ArduinoHardwareConfig } from '../types/simhub';
import { 
  Gamepad2, 
  Copy, 
  Check, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface SimHubSetupGuideProps {
  config: ArduinoHardwareConfig;
}

export const SimHubSetupGuide: React.FC<SimHubSetupGuideProps> = ({ config }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ncalcExpression = `format('<S;{0};{1};{2};{3};{4};{5};{6};{7};{8};{9};{10};{11};{12};{13};{14};{15};{16}>\\n',
  round([SpeedKmh], 1),
  round([Rpms]),
  isnull([Gear], 'N'),
  round(isnull([Fuel_LitersPer100Km], 24), 1),
  round(isnull([EngineWaterTemperature], 90)),
  round(isnull([OilTemperature], 95)),
  [GameRawData.Lights_LowBeam] ? 1 : 0,
  [GameRawData.Lights_HighBeam] ? 1 : 0,
  [GameRawData.Lights_FogFront] ? 1 : 0,
  [GameRawData.Lights_FogRear] ? 1 : 0,
  ([EngineWaterTemperatureWarning] || [OilPressureWarning] || [EngineIgnitionOn] == 0) ? 1 : 0,
  [ABSActive] ? 1 : 0,
  [TCActive] ? 1 : 0,
  [Handbrake] ? 1 : 0,
  [TurnIndicatorLeft] ? 1 : 0,
  [TurnIndicatorRight] ? 1 : 0,
  [EngineIgnitionOn] ? 2 : 1
)`;

  const jsExpression = `return '<S;' +
  Math.round($prop('SpeedKmh') * 10) / 10 + ';' +
  Math.round($prop('Rpms')) + ';' +
  ($prop('Gear') || 'N') + ';' +
  Math.round($prop('Fuel_LitersPer100Km') || 24) + ';' +
  Math.round($prop('EngineWaterTemperature') || 90) + ';' +
  Math.round($prop('OilTemperature') || 95) + ';' +
  ($prop('GameRawData.Lights_LowBeam') ? 1 : 0) + ';' +
  ($prop('GameRawData.Lights_HighBeam') ? 1 : 0) + ';' +
  ($prop('GameRawData.Lights_FogFront') ? 1 : 0) + ';' +
  ($prop('GameRawData.Lights_FogRear') ? 1 : 0) + ';' +
  (($prop('EngineWaterTemperatureWarning') || $prop('OilPressureWarning')) ? 1 : 0) + ';' +
  ($prop('ABSActive') ? 1 : 0) + ';' +
  ($prop('TCActive') ? 1 : 0) + ';' +
  ($prop('Handbrake') ? 1 : 0) + ';' +
  ($prop('TurnIndicatorLeft') ? 1 : 0) + ';' +
  ($prop('TurnIndicatorRight') ? 1 : 0) + ';' +
  ($prop('EngineIgnitionOn') ? 2 : 1) + '>\\n';`;

  const connectMsg = `<S;0;0;N;24;90;95;0;0;0;0;0;0;0;1;0;0;2>\\n`;
  const disconnectMsg = `<S;0;0;N;0;0;0;0;0;0;0;0;0;0;0;0;0;0>\\n`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadHeader = () => {
    const link = document.createElement('a');
    link.href = '/Aston_Martin_DB9_SimHub_Config.h';
    link.download = 'Aston_Martin_DB9_SimHub_Config.h';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-zinc-900/90 rounded-xl p-5 border border-zinc-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                SimHub Custom Serial Device Integration Guide
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Pure .ino + .h Format
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Directly compatible with Arduino IDE — no unsupported files (.json, etc.).
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadHeader}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Aston_Martin_DB9_SimHub_Config.h</span>
          </button>
        </div>

        {/* Arduino IDE Compatibility Badge */}
        <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg flex items-center gap-2.5 text-xs text-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>100% Arduino IDE Native:</strong> All SimHub protocol definitions and expressions are stored in <code className="font-mono text-emerald-300 bg-emerald-900/40 px-1 py-0.5 rounded">.h</code> header tabs alongside your <code className="font-mono text-emerald-300 bg-emerald-900/40 px-1 py-0.5 rounded">.ino</code> sketch file.
          </span>
        </div>

        {/* 4-Step Setup Walkthrough */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-4">
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs">1</div>
            <h4 className="font-bold text-zinc-200 text-xs">Flash Arduino Mega</h4>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Open the sketch folder containing <code className="text-sky-400 font-mono">.ino</code> and <code className="text-sky-400 font-mono">.h</code> files in Arduino IDE, select <strong>Arduino Mega 2560</strong>, and click <strong>Upload</strong>.
            </p>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs">2</div>
            <h4 className="font-bold text-zinc-200 text-xs">Open Custom Serial</h4>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              In SimHub, click <strong>Custom Serial Devices</strong> on the left sidebar &rarr; click <strong>Add Device</strong>. Set Baud rate to <strong className="text-zinc-200 font-mono">{config.baudRate}</strong>.
            </p>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs">3</div>
            <h4 className="font-bold text-zinc-200 text-xs">Set Connect / Disconnect</h4>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Copy the <strong>Connect message</strong> (triggers "POWER, BEAUTY, SOUL" wakeup) and <strong>Disconnect message</strong> (puts cluster to sleep on game exit).
            </p>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs">4</div>
            <h4 className="font-bold text-zinc-200 text-xs">Paste Telemetry Expression</h4>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Paste the <strong>Update message expression</strong> below into SimHub. Set refresh rate to <strong>30Hz or 50Hz</strong> and launch any racing sim!
            </p>
          </div>
        </div>
      </div>

      {/* Connection & Disconnection Messages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connect Message */}
        <div className="bg-zinc-900/90 rounded-xl p-4 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              1. SimHub Connection Message (Wakeup)
            </span>
            <button
              onClick={() => handleCopy(connectMsg, 'connect')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono"
            >
              {copiedId === 'connect' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>
          <pre className="p-2.5 bg-black rounded-lg text-emerald-300 font-mono text-xs overflow-x-auto">
            {connectMsg}
          </pre>
          <p className="text-[11px] text-zinc-500">
            Transmitted once when SimHub connects to COM port. Commands the Aston Martin cluster to wake up and display "POWER, BEAUTY, SOUL". Defined in <code className="font-mono text-zinc-300">SIMHUB_CONNECT_MESSAGE</code> in <code className="font-mono text-sky-400">Aston_Martin_DB9_SimHub_Config.h</code>.
          </p>
        </div>

        {/* Disconnect Message */}
        <div className="bg-zinc-900/90 rounded-xl p-4 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              2. SimHub Disconnection Message (Sleep)
            </span>
            <button
              onClick={() => handleCopy(disconnectMsg, 'disconnect')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono"
            >
              {copiedId === 'disconnect' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
          </div>
          <pre className="p-2.5 bg-black rounded-lg text-amber-300 font-mono text-xs overflow-x-auto">
            {disconnectMsg}
          </pre>
          <p className="text-[11px] text-zinc-500">
            Transmitted when SimHub closes. Commands the Aston Martin cluster into deep sleep. Defined in <code className="font-mono text-zinc-300">SIMHUB_DISCONNECT_MESSAGE</code>.
          </p>
        </div>
      </div>

      {/* Main Telemetry Expression (NCalc / JavaScript) */}
      <div className="bg-zinc-900/90 rounded-xl p-5 border border-zinc-800 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              3. SimHub "Update Message" Expression (NCalc Formula)
            </h4>
            <p className="text-xs text-zinc-400">
              Paste this directly into SimHub &rarr; Custom Serial Device &rarr; Update Message &rarr; Computed (NCalc)
            </p>
          </div>

          <button
            onClick={() => handleCopy(ncalcExpression, 'ncalc')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all shadow-sm"
          >
            {copiedId === 'ncalc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedId === 'ncalc' ? 'Copied Expression!' : 'Copy NCalc Expression'}</span>
          </button>
        </div>

        <div className="p-4 bg-black rounded-xl border border-zinc-800/80 font-mono text-xs text-sky-300 overflow-x-auto select-all leading-relaxed">
          <pre>{ncalcExpression}</pre>
        </div>
      </div>

      {/* Alternative JavaScript Expression */}
      <div className="bg-zinc-900/90 rounded-xl p-5 border border-zinc-800 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Alternative: JavaScript Formula (SimHub JS Engine)
            </h4>
            <p className="text-xs text-zinc-400">
              If your SimHub profile prefers JavaScript over NCalc
            </p>
          </div>

          <button
            onClick={() => handleCopy(jsExpression, 'js')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all shadow-sm"
          >
            {copiedId === 'js' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedId === 'js' ? 'Copied JS!' : 'Copy JS Expression'}</span>
          </button>
        </div>

        <div className="p-4 bg-black rounded-xl border border-zinc-800/80 font-mono text-xs text-blue-300 overflow-x-auto select-all leading-relaxed">
          <pre>{jsExpression}</pre>
        </div>
      </div>

      {/* Important SimHub Troubleshooting */}
      <div className="bg-sky-950/20 border border-sky-800/40 rounded-xl p-4 space-y-2 text-xs text-sky-200">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <AlertTriangle className="w-4 h-4" />
          <span>SimHub Connection Troubleshooting Checklist:</span>
        </div>
        <ul className="space-y-1 list-disc list-inside text-zinc-300">
          <li><strong>COM Port Conflict:</strong> Always make sure the Arduino IDE's Serial Monitor is <span className="underline font-semibold">closed</span> before starting SimHub. Windows cannot share a serial port between two applications.</li>
          <li><strong>Baud Rate:</strong> Confirm SimHub's Custom Serial Device is set to exactly <strong>115200</strong> (matching <code>Serial.begin(115200)</code> in the sketch).</li>
          <li><strong>Update Rate:</strong> In SimHub, set the update frequency to <strong>30 Hz or 50 Hz</strong> for silky-smooth counter-clockwise tachometer movement!</li>
        </ul>
      </div>
    </div>
  );
};

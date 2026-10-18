import React from 'react';
import { Cpu, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const WiringPinout: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 18-Pin Kombi Harness */}
      <div className="bg-zinc-900/90 rounded-xl p-5 border border-zinc-800 shadow-md">
        <h3 className="text-sm font-bold text-zinc-100 mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          BMW E90 Instrument Cluster 18-Pin Harness (X11175 Plug)
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Connect your 12V power supply and MCP2515 CAN module to these 5 essential pins:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3 text-left">PIN #</th>
                <th className="py-2.5 px-3 text-left">SIGNAL</th>
                <th className="py-2.5 px-3 text-left">FACTORY WIRE COLOR</th>
                <th className="py-2.5 px-3 text-left">HARDWARE CONNECTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              <tr className="hover:bg-zinc-800/40">
                <td className="py-2.5 px-3 font-bold text-red-400">Pin 1</td>
                <td className="py-2.5 px-3 font-semibold">KL30 (+12V Battery)</td>
                <td className="py-2.5 px-3">Red / Green</td>
                <td className="py-2.5 px-3 text-red-300">+12V DC (from 12V 2A Power Supply)</td>
              </tr>
              <tr className="hover:bg-zinc-800/40">
                <td className="py-2.5 px-3 font-bold text-orange-400">Pin 9</td>
                <td className="py-2.5 px-3 font-semibold">15WUP (Wakeup line)</td>
                <td className="py-2.5 px-3">Green</td>
                <td className="py-2.5 px-3 text-orange-300">+12V DC (Tie together with Pin 1)</td>
              </tr>
              <tr className="hover:bg-zinc-800/40">
                <td className="py-2.5 px-3 font-bold text-zinc-200">Pin 18</td>
                <td className="py-2.5 px-3 font-semibold">KL31 (Ground)</td>
                <td className="py-2.5 px-3">Brown</td>
                <td className="py-2.5 px-3 text-zinc-300">12V Power Supply GND AND Arduino Mega GND</td>
              </tr>
              <tr className="hover:bg-zinc-800/40">
                <td className="py-2.5 px-3 font-bold text-amber-400">Pin 7</td>
                <td className="py-2.5 px-3 font-semibold">K-CAN High (CAN_H)</td>
                <td className="py-2.5 px-3">Green / Orange</td>
                <td className="py-2.5 px-3 text-amber-300">MCP2515 CAN_H Terminal</td>
              </tr>
              <tr className="hover:bg-zinc-800/40">
                <td className="py-2.5 px-3 font-bold text-emerald-400">Pin 6</td>
                <td className="py-2.5 px-3 font-semibold">K-CAN Low (CAN_L)</td>
                <td className="py-2.5 px-3">Green</td>
                <td className="py-2.5 px-3 text-emerald-300">MCP2515 CAN_L Terminal</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Arduino Mega SPI Guide */}
      <div className="bg-zinc-900/90 rounded-xl p-5 border border-zinc-800 shadow-md">
        <h3 className="text-sm font-bold text-zinc-100 mb-1 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-500" />
          Arduino Mega 2560 &amp; MCP2515 SPI Pin Mapping
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Hardware SPI on ATmega2560 is routed to pins 50-52 (not pins 11-13 as on Arduino Uno):
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 block text-[10px]">MCP2515 MOSI</span>
            <span className="text-emerald-400 font-bold text-sm">Mega Pin 51 (or ICSP)</span>
          </div>
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 block text-[10px]">MCP2515 MISO</span>
            <span className="text-emerald-400 font-bold text-sm">Mega Pin 50 (or ICSP)</span>
          </div>
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 block text-[10px]">MCP2515 SCK</span>
            <span className="text-emerald-400 font-bold text-sm">Mega Pin 52 (or ICSP)</span>
          </div>
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 block text-[10px]">Seeed Shield CS</span>
            <span className="text-amber-400 font-bold text-sm">Mega Pin 10</span>
          </div>
        </div>

        {/* Seeed Studio Shield Specific Callout */}
        <div className="mt-4 p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-lg space-y-2 text-xs">
          <span className="font-bold text-amber-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Seeed Studio CAN-BUS Shield Setup Instructions:
          </span>
          <ul className="text-zinc-300 space-y-1 list-disc list-inside">
            <li><strong>CS Pin:</strong> Hardwired to <strong>Digital Pin 10</strong> on the Seeed Shield (configured in code: <code className="text-amber-300 font-mono">const int CAN_CS_PIN = 10;</code>).</li>
            <li><strong>Oscillator:</strong> Seeed Studio CAN-BUS Shields (V1.0, V1.2, V2.0) are equipped with a <strong>16 MHz crystal</strong>. The initialization call must use <code className="text-amber-300 font-mono">CAN0.begin(MCP_ANY, CAN_100KBPS, MCP_16MHZ)</code>.</li>
            <li><strong>ICSP Header:</strong> When stacking the Seeed shield onto the Arduino Mega 2560, ensure the 6-pin female ICSP header on the underside of the shield firmly mates with the 6 male ICSP pins on the Mega. This carries the hardware SPI signals!</li>
            <li><strong>CAN Terminal:</strong> Connect BMW E90 <strong>Pin 7 (CAN_H)</strong> to Seeed Shield <strong>CANH</strong> and <strong>Pin 6 (CAN_L)</strong> to <strong>CANL</strong>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

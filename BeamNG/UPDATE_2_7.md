# ESC and headlight update

Install both the new full SimHubFormula.js and this release's BeamNG/simhubextras.zip. Close BeamNG, replace the existing simhubextras.zip in its active user mods folder, and restart the game. Keep only one active copy of the mod. If using the v2.5 or v2.6 Arduino firmware, no reflash is needed; the speed fix and existing CAN mappings are retained.

## Behavior

- ESC OR traction intervention selects TC state 1, sending 354 byte 5 = 80 plus the documented ABS/handbrake combination.
- Explicit ESC disabled selects VDC state 3, sending 40, 42, 48 or 4A depending on ABS and handbrake.
- Intervention takes priority over disabled-state telemetry if contradictory states occur. Explicit property overrides still take priority over automatic detection.
- High beam also asserts the low-beam serial flag. Existing firmware uses that flag to keep the documented parking/low-beam indicator on, alongside the high-beam indicator. No new low-beam CAN bit is invented.
- Gear preserves the reported N where this BeamNG setup does not distinguish Park. Road-speed firmware correction is unchanged. Cruise target remains direct km/h.

## Companion telemetry version 207

| SimHub raw field | Meaning |
|---|---|
| reserved_4 | 207 identifies this release |
| reserved_1 | 3 = ESC explicitly disabled, 0 = explicitly enabled, -1 = unknown |
| reserved_2 | ABS activity 0/1 or -1 unavailable |
| reserved_3 | ESC OR TC activity 0/1 or -1 unavailable |

Version 203 used reserved_1 for gear; version 207 repurposes it for disabled state because the current formula does not consume the gear slot. The formula checks the version marker before reading that state, so an older gear value cannot be mistaken for ESC Off. Earlier companion v203 remains readable for activity but cannot supply the new disabled-state mapping.

## Evidence and limits

The original installed SimHub Lua coupled activity to dashboard lamp pulses, overwrote the ESC result when TC was also active, and used Lua truthiness where numeric zero is true. This release removes that block and writes light_TC directly from the positive ESC/TC activity flags. The JavaScript also combines both direct activity fields when available rather than allowing a zero flat lamp value to hide ESC intervention.

Disabled-state detection uses guarded access to the legacy esc controller's getCurrentConfigData().escEnabled or the driveModes active mode's explicit yawControl setting. Missing controllers, unsupported configurations and exceptions return unknown; they never imply disabled. This follows the controller paths described by a [BeamNG developer](https://www.beamng.com/threads/more-data-in-outgauge-packet.86251/). The approach may not cover every current vehicle or third-party controller. No disabled state is inferred from lack of intervention or a steady/blinking lamp.

In SimHub's property view, confirm reserved_4 is 207. With ESC disabled on a supported vehicle, reserved_1 should be 3; during intervention, reserved_3 should be 1. If the marker is 203 or missing, replace the active mod and use the SH Telemetry/Extra integration. If the marker is 207 but reserved_1 is -1, that vehicle configuration is unsupported by the current off-state reader; map an explicit property override if available.

Validation: 45 JavaScript scenarios pass, including ESC-only intervention, explicit disabled state, unknown configuration, version gating, override priority, stopped-game clearing, and simultaneous low/high indicators. The Lua payload definition is unchanged and the rebuilt mod archive is verified. Lua controller access and physical lamp behavior have not been executed in BeamNG here, so these are implemented corrections awaiting live confirmation.

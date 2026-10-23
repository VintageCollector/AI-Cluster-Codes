# Version 2.7 installation

Follow UPDATE_2_7.md in this folder. The current marker is 207; reserved_1 now reports ESC-disabled state, not gear. References to marker 203 and selector values below describe the earlier companion protocol only.

# Current gear behavior in version 2.6

The user has accepted that this BeamNG setup reports N for Park. The formula no longer substitutes reserved_1 into gear selection. It preserves the reported N, and supports P only from an actual textual gear property or explicit gear override. The companion remains optional for direct ABS/ESC activity; the selector discussion below describes its exported data, not a guaranteed Park fix.

# BeamNG fix for headlights warnings and Park

The previous formula assumed `GameRawData.electrics` existed. Inspection of the installed SimHub `LFSReader.dll` and its bundled `simhubextras.lua` shows the BeamNG Extra protocol exports a flat structure instead. This release reads `DataCorePlugin.GameRawData.light_HighBeam`, `light_LowBeam`, `light_Fog`, `light_Abs`, `light_TC`, `light_Signal_L`, `light_Signal_R` and `input_parkingBrake` / `light_Parkingbrake`. Direct electrics paths remain fallbacks for integrations that expose them.

## Apply the fix

1. In SimHub, select the BeamNG integration with the Extra telemetry add-on and complete its game configuration. The plain OutGauge integration does not provide this full flat telemetry structure.
2. Close BeamNG. Back up the existing `simhubextras.zip` in BeamNG's active user folder under `mods`. Use the BeamNG launcher Manage User Folder option to locate that folder.
3. Replace that existing mod with this folder's `simhubextras.zip`. Keep only one active copy; put backups outside the mods folder. Do not place this entire GT-R project ZIP in BeamNG's mods folder.
4. Restart BeamNG, spawn the vehicle and seat the player in it. In SimHub, paste the new root `SimHubFormula.js` into the Mega's Arduino Custom Protocol formula with JavaScript enabled. The existing version 2 Arduino firmware is compatible; no new flash is required for this telemetry fix.
5. Inspect `DataCorePlugin.GameRawData.reserved_4` in SimHub's property picker. **203** confirms the companion is transmitting. `reserved_1` is 1 for P, 2 for N, 3 for R, 4 for D and 0 for other displayed gears. Check P and N separately. If this property is missing, confirm the Extra integration and active mod copy before testing the cluster.
6. Test low/high headlights, handbrake, ABS intervention and traction/ESC intervention. Inspect the `light_*` properties while testing. ABS and TC activity are intervention signals, not merely equipment enabled. TC-disabled/VDC-disabled mapping still requires explicit overrides; it is not inferred from a blinking lamp.

The mod is based on the SimHub add-on installed on this computer. A SimHub game repair/update may replace it; reapply this copy afterward if needed. Keep your backup for rollback. No installed game or SimHub files were changed by creation of this package.

## Why the companion is included

The installed add-on sends `(gearIndex or 0) + 1`. That numeric value cannot distinguish Park from Neutral. Its ABS/TC lamp values may also blink instead of reporting continuous intervention, and its handbrake lamp is integer-valued. The formula now reads the floating-point parking-brake input, and the companion supplies the missing selector/activity signals using four existing reserved float slots. Struct size, field order, UDP port and Arduino message format are unchanged:

| Existing field | Companion meaning |
|---|---|
| reserved_1 | P=1, N=2, R=3, D=4, other=0 from displayed `electrics.values.gear` |
| reserved_2 | `absActive`: 0/1, or -1 when absent |
| reserved_3 | `escActive` OR `tcsActive`: 0/1, or -1 when both absent |
| reserved_4 | Companion marker 203 |

No gear is inferred from vehicle speed or handbrake. P is only selected when an actual displayed P is reported, or a configured gear override supplies P. A gear override can reference an existing custom selector property instead of using the companion. Source Lua is included for review; the packaged mod preserves the original zip's other files.

Sources: locally inspected SimHub add-on and `LFSReader.BeamNgManagerExtraTelemetry`; [BeamNG electrics documentation](https://documentation.beamng.com/modding/vehicle/vehicle_system/electrics/) and [BeamNG's electrics sensor source](https://github.com/BeamNG/BeamNGpy/blob/master/src/beamngpy/sensors/electrics.py). These establish source field names; live SimHub/game testing is still needed to confirm delivery on the user's setup.

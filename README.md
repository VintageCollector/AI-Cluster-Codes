## Hardware and installation

1. Open Panamera970/Panamera970.ino in Arduino IDE. Select Mega 2560 / ATmega2560 and upload this complete sketch folder. Do not upload SHCustomProtocol.h alone.
2. Use the Seeed CAN\_BUS\_Shield library providing mcp2515\_can.h; verification used version 2.3.4 and Arduino AVR core 1.8.8. Default hardware assumptions are CS 9, MCP2515 16 MHz and 500 kbit/s, inherited from the user's existing Mega/shield setup rather than confirmed by this workbook. The settings are in SHCustomProtocol.h. Use the Mega SPI/ICSP connection and the cluster's verified power/CAN wiring. No Panamera connector pinout was supplied.
3. In SimHub select this device, named Porsche Panamera 970, in Multiple USB mode. Enable Arduino Custom Protocol and Use JavaScript, then paste the entire SimHubFormula\_Panamera970.js. SimHub adds the newline. Do not also open the same port as a Custom Serial Device.
4. For BeamNG SH Telemetry/Extra, close the game, replace its active mods/simhubextras.zip with BeamNG/simhubextras.zip from this package, and restart. Keep one active copy and put the backup outside mods. 

## 

## Launch-control rule

Enabled for BeamNG, ETS2, ATS and original Assetto Corsa only:

1. Valid raw speed is exactly zero, before rounding.
2. Valid raw RPM is greater than 4000, before rounding.
3. Gear is Drive or first Drive/Sport: D, D1, S1, A1 or numeric 1.
4. ESC/DSC is explicitly confirmed off.

## LCD button wiring
Use four normally-open momentary buttons, matching the user's original test sketch:
Function	Mega digital pin	Other button terminal
Up	D6	Mega GND
Down	D4	Mega GND
OK / Enter	D5	Mega GND
Back / Return	D7	Mega GND



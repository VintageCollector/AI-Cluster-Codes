This Arduino code is for a BMW G30 cluster. 
## Hardware & upload

1. Connect **Arduino Mega 2560** to your PC and Seeed Studio CAN-BUS Shield **V2.0** to Mega SPI. Shield MCP2515 assumed **16 MHz, 500 kbps, CS=D9**; use Mega hardware SPI (D50/51/52, D53 kept as output).
2. Install **MCP_CAN_lib** by **Cory J. Fowler** (`mcp_can.h`) through Arduino Library Manager or an equivalent compatible installation. 
3. In Arduino IDE open `DisplayClientV2/DisplayClientV2.ino`, select **Tools → Board → Arduino Mega or Mega 2560**, and compile/upload. 
4. In SimHub choose **Arduino → My Hardware** and connect the detected board. In **Custom Protocol** enable **Use JavaScript**, paste the complete text from `SimHubFormula.js`, and enable a short refresh (e.g. 25–50 ms) if adjustable.
5. SimHub's Arduino transport sends the custom protocol command and appends the line terminator. **Do not** configure this firmware through **Custom Serial Devices**, and do not add `\n` to the JavaScript output.
6. Note: I've used a Mega so, but you can use an Uno board also similar steps.

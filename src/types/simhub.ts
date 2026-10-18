export interface SimHubPacket {
  speed: number;        // km/h (0 - 260)
  rpm: number;          // 0 - 8000
  gear: string;         // 'R', 'N', '1', '2', '3', '4', '5', '6'
  mpg: number;          // Fuel Economy (0 - 50 MPG / L100km)
  waterTemp: number;    // °C (40 - 130)
  oilTemp: number;      // °C (50 - 150)
  lowBeam: boolean;
  highBeam: boolean;
  fogFront: boolean;
  fogRear: boolean;
  checkEngine: boolean; // MIL
  abs: boolean;
  tc: boolean;          // Traction control / DTC
  handbrake: boolean;
  turnL: boolean;
  turnR: boolean;
  fuelLevel: number;    // 0 - 100%
  ignition: number;     // 0=Sleep, 1=Acc, 2=Ignition On, 3=Engine Run
}

export interface ArduinoHardwareConfig {
  mcpClock: '8MHz' | '16MHz';
  csPin: number; // 53 or 10
  canSpeed: '100kbps' | '500kbps';
  baudRate: number; // 115200 or 250000 or 500000
  enableBacklightWithLights: boolean;
}

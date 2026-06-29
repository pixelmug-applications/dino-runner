declare module '../../../../jeejio-bubble/sdk/WebApp.js' {
  export class BubbleWebApp {
    constructor(options?: Record<string, unknown>);
    ble?: {
      connect(device: unknown, options?: Record<string, unknown>): Promise<unknown>;
      send(device: unknown, payload: unknown, options?: Record<string, unknown>): Promise<unknown>;
      onState(listener: (event: { state?: string; data?: string }) => void): void;
      off(event: string, listener: (...args: unknown[]) => void): void;
    };
    getDevices(options?: Record<string, unknown>): Promise<unknown[]>;
  }
}

declare module '../../../../jeejio-bubble/devices/PixelMug_1.1.js' {
  const PixelMug: unknown;
  export default PixelMug;
}

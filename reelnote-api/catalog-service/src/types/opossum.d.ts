declare module "opossum" {
  export interface Options {
    timeout?: number;
    resetTimeout?: number;
    errorThresholdPercentage?: number;
    volumeThreshold?: number;
  }

  export default class CircuitBreaker<T = unknown> {
    constructor(
      action: (...args: unknown[]) => Promise<T> | T,
      options?: Options,
    );
    fire(...args: unknown[]): Promise<T>;
    on(event: string, listener: (...args: unknown[]) => void): this;
    shutdown(): Promise<void>;
  }
}

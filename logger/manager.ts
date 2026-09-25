import { ILogTransport, LogEntry } from './types';
import { ConsoleTransport, FileTransport, CustomLoggerTransport } from './transports';

export class LoggerManager {
  private static transports: Map<string, ILogTransport> = new Map();

  static {
    // Default to console transport
    this.transports.set('console', new ConsoleTransport());
  }

  /**
   * Add a log transport with a unique identifier.
   */
  static addTransport(name: string, transport: ILogTransport): void {
    this.transports.set(name, transport);
  }

  /**
   * Remove a log transport by name.
   */
  static removeTransport(name: string): void {
    this.transports.delete(name);
  }

  /**
   * Retrieve a transport by name.
   */
  static getTransport(name: string): ILogTransport | undefined {
    return this.transports.get(name);
  }

  /**
   * Convenient helper to enable logging to a file.
   */
  static enableFileLogging(filePath: string, format: 'json' | 'text' = 'text'): void {
    this.addTransport('file', new FileTransport({ filePath, format }));
  }

  /**
   * Convenient helper to plug in an external logger (e.g. Winston, Pino).
   */
  static setCustomLogger(logger: any): void {
    this.addTransport('custom', new CustomLoggerTransport(logger));
  }

  /**
   * Dispatch a log entry to all active or specified transports.
   */
  static dispatch(entry: LogEntry, transportNames?: string[]): void {
    if (transportNames && transportNames.length > 0) {
      for (const name of transportNames) {
        const transport = this.transports.get(name);
        if (transport) {
          transport.log(entry);
        }
      }
    } else {
      for (const transport of this.transports.values()) {
        transport.log(entry);
      }
    }
  }

  /**
   * Reset transports to default (useful for tests).
   */
  static reset(): void {
    this.transports.clear();
    this.transports.set('console', new ConsoleTransport());
  }
}

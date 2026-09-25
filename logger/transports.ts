import * as fs from 'fs';
import * as path from 'path';
import { ILogTransport, LogEntry, LogLevel } from './types';

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class ConsoleTransport implements ILogTransport {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  log(entry: LogEntry): void {
    if (LEVEL_SEVERITY[entry.level] < LEVEL_SEVERITY[this.minLevel]) {
      return;
    }

    const duration = entry.durationMs !== undefined ? ` [${entry.durationMs.toFixed(2)}ms]` : '';
    const target = entry.className ? `${entry.className}.${entry.method}` : entry.method;
    let msg = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${target}${duration}`;

    if (entry.args !== undefined && entry.args.length > 0) {
      try {
        msg += ` - Args: ${JSON.stringify(entry.args)}`;
      } catch {
        msg += ` - Args: [unserializable]`;
      }
    }

    if (entry.result !== undefined) {
      try {
        msg += ` - Response: ${JSON.stringify(entry.result)}`;
      } catch {
        msg += ` - Response: [unserializable]`;
      }
    }

    if (entry.additionalInfo && entry.additionalInfo.length > 0) {
      msg += ` - Info: ${entry.additionalInfo.join(' ')}`;
    }

    if (entry.error) {
      msg += ` - Error: ${entry.error.message}`;
    }

    switch (entry.level) {
      case 'error':
        console.error(msg);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
      case 'warn':
        console.warn(msg);
        break;
      case 'debug':
        console.debug ? console.debug(msg) : console.log(msg);
        break;
      default:
        console.log(msg);
        break;
    }
  }
}

export interface FileTransportOptions {
  filePath: string;
  format?: 'json' | 'text';
  minLevel?: LogLevel;
}

export class FileTransport implements ILogTransport {
  private filePath: string;
  private format: 'json' | 'text';
  private minLevel: LogLevel;

  constructor(options: FileTransportOptions) {
    this.filePath = path.resolve(options.filePath);
    this.format = options.format ?? 'text';
    this.minLevel = options.minLevel ?? 'info';

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  log(entry: LogEntry): void {
    if (LEVEL_SEVERITY[entry.level] < LEVEL_SEVERITY[this.minLevel]) {
      return;
    }

    let line: string;
    if (this.format === 'json') {
      line = JSON.stringify(entry) + '\n';
    } else {
      const duration = entry.durationMs !== undefined ? ` [${entry.durationMs.toFixed(2)}ms]` : '';
      const target = entry.className ? `${entry.className}.${entry.method}` : entry.method;
      let msg = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${target}${duration}`;

      if (entry.args !== undefined) {
        msg += ` - Args: ${JSON.stringify(entry.args)}`;
      }
      if (entry.result !== undefined) {
        msg += ` - Response: ${JSON.stringify(entry.result)}`;
      }
      if (entry.error) {
        msg += ` - Error: ${entry.error.message}`;
      }
      if (entry.additionalInfo && entry.additionalInfo.length > 0) {
        msg += ` - Info: ${entry.additionalInfo.join(' ')}`;
      }
      line = msg + '\n';
    }

    fs.appendFileSync(this.filePath, line, 'utf-8');
  }
}

export class CustomLoggerTransport implements ILogTransport {
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  log(entry: LogEntry): void {
    const fn = this.logger[entry.level] || this.logger.log || this.logger.info;
    if (typeof fn === 'function') {
      fn.call(this.logger, entry);
    }
  }
}

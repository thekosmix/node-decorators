export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  method: string;
  className?: string;
  args?: any[];
  result?: any;
  durationMs?: number;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  additionalInfo?: any[];
}

export interface ILogTransport {
  log(entry: LogEntry): void | Promise<void>;
}

export interface LogOptions {
  level?: LogLevel;
  logRequest?: boolean;
  logResponse?: boolean;
  logDuration?: boolean;
  maskParams?: string[];
  transports?: string[];
  additionalInfo?: any[];
}

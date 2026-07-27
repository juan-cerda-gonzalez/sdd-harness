type LogMetadata = Record<string, unknown>;

export class Logger {
  info(message: string, metadata?: LogMetadata): void {
    console.log(JSON.stringify({ level: 'info', message, ...metadata }));
  }

  warn(message: string, metadata?: LogMetadata): void {
    console.warn(JSON.stringify({ level: 'warn', message, ...metadata }));
  }

  error(message: string, metadata?: LogMetadata): void {
    console.error(JSON.stringify({ level: 'error', message, ...metadata }));
  }
}

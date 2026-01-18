import { toast } from 'sonner';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  component?: string;
  action?: string;
  user_id?: string;
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private isDev = process.env.NODE_ENV === 'development';

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`;
  }

  public info(message: string, context?: LogContext) {
    if (this.isDev) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  public warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
  }

  public error(message: string, error?: any, context?: LogContext) {
    console.error(this.formatMessage('error', message, context), error);
    // Future: Send to Sentry/LogRocket
  }

  public debug(message: string, context?: LogContext) {
    if (this.isDev) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Handles API errors with toast notification and logging
   */
  public handleApiError(error: any, userMessage: string, context?: LogContext) {
    this.error(userMessage, error, context);
    toast.error(userMessage + (this.isDev ? `: ${error.message}` : ''));
  }
}

export const logger = Logger.getInstance();

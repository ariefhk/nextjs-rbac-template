/* eslint-disable @typescript-eslint/no-explicit-any */
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from './env';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports: winston.transport[] = [
  // Console output
  new winston.transports.Console({
    format: consoleFormat,
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
];

// File transports for production
if (env.NODE_ENV === 'production') {
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat,
    })
  );

  // Combined logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: logFormat,
    })
  );

  // Security audit logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxFiles: '90d',
      maxSize: '20m',
      format: logFormat,
    })
  );
}

export const logger = winston.createLogger({
  levels: logLevels,
  level: env.LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Security event logger
export const securityLogger = {
  logAuthAttempt: (success: boolean, email: string, ip?: string) => {
    logger.info('Authentication attempt', {
      type: 'AUTH_ATTEMPT',
      success,
      email,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  logAuthSuccess: (userId: string, email: string, ip?: string) => {
    logger.info('Successful authentication', {
      type: 'AUTH_SUCCESS',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  logAuthFailure: (email: string, reason: string, ip?: string) => {
    logger.warn('Failed authentication', {
      type: 'AUTH_FAILURE',
      email,
      reason,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  logRoleChange: (
    targetUserId: string,
    roleId: string,
    action: 'assigned' | 'removed',
    performedBy: string
  ) => {
    logger.info('Role change', {
      type: 'ROLE_CHANGE',
      targetUserId,
      roleId,
      action,
      performedBy,
      timestamp: new Date().toISOString(),
    });
  },

  logPermissionCheck: (
    userId: string,
    resource: string,
    action: string,
    granted: boolean
  ) => {
    logger.debug('Permission check', {
      type: 'PERMISSION_CHECK',
      userId,
      resource,
      action,
      granted,
      timestamp: new Date().toISOString(),
    });
  },

  logSecurityEvent: (
    event: string,
    userId: string,
    metadata: any,
    ip?: string
  ) => {
    logger.warn('Security event', {
      type: 'SECURITY_EVENT',
      event,
      userId,
      metadata,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  logSuspiciousActivity: (
    reason: string,
    userId?: string,
    ip?: string,
    metadata?: any
  ) => {
    logger.error('Suspicious activity detected', {
      type: 'SUSPICIOUS_ACTIVITY',
      reason,
      userId,
      ip,
      metadata,
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;

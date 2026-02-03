// src/logger.ts
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import pretty from 'pino-pretty';
import dotenv from 'dotenv';

dotenv.config();

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV === 'development';

let loggerInstance: pino.Logger;

if (isTest) {
  loggerInstance = pino({
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        singleLine: true,
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  });
} else if (isDev) {
  loggerInstance = pino(
    { level: 'info', timestamp: pino.stdTimeFunctions.isoTime },
    pino.multistream([
      {
        level: 'info',
        stream: pretty({
          singleLine: true,
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        }),
      },
      { level: 'info', stream: fs.createWriteStream(path.join(logDir, 'info.log'), { flags: 'a' }) },
      { level: 'warn', stream: fs.createWriteStream(path.join(logDir, 'warn.log'), { flags: 'a' }) },
      { level: 'error', stream: fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' }) },
    ])
  );
} else {
  loggerInstance = pino({
    level: 'info',
    transport: {
      target: 'pino/file',
      options: { destination: path.join(logDir, 'app-prod.log') },
    },
  });
}

export const logger = {
  info: (msg: string, data?: unknown) => loggerInstance.info(data ?? {}, msg),
  warn: (msg: string, data?: unknown) => loggerInstance.warn(data ?? {}, msg),
  error: (msg: string, err?: Error, data?: unknown) =>
    loggerInstance.error(
      {
        err,
        ...(typeof data === 'object' ? data : {}),
      },
      msg
    ),
};

import * as fs from 'fs';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
   fs.mkdirSync(logDir, { recursive: true });
}

const write = (level: string, msg: string, data?: any) => {
   const timestamp = new Date().toISOString();
   const entry = `[${timestamp}] [${level}] ${msg} ${data ? JSON.stringify(data) : ''}`;

   console.log(entry);
   fs.appendFileSync(path.join(logDir, `${level.toLowerCase()}.log`), entry + '\n');
};

export const logger = {
   info: (msg: string, data?: any) => write('INFO', msg, data),
   warn: (msg: string, data?: any) => write('WARN', msg, data),
   error: (msg: string, err?: Error, data?: any) =>
      write('ERROR', msg, { error: err?.message, ...data }),
};

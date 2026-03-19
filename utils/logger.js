const format = (level, message) => `[${level}] ${message}`;

export const logger = {
  info: (message) => console.log(format('INFO', message)),
  warn: (message) => console.warn(format('WARN', message)),
  error: (message, error) => {
    console.error(format('ERROR', message));
    if (error) console.error(error);
  },
};

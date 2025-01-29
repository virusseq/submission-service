import { Logger, LoggerOptions, pino } from 'pino';

// Singleton logger instance
let loggerInstance: Logger;

const pinoConfig: LoggerOptions = {
	level: process.env.LOG_LEVEL || 'info',
	formatters: {
		level: (label) => {
			return { level: label.toUpperCase() };
		},
	},
	timestamp: pino.stdTimeFunctions.isoTime,
};

const getLogger = (): Logger => {
	if (!loggerInstance) {
		loggerInstance = pino(pinoConfig);
	}
	return loggerInstance;
};

/**
 * The singleton logger instance that is initialized once and can be used
 * throughout the application.
 */
const logger = getLogger();
export default logger;

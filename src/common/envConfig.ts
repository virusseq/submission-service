import dotenv from 'dotenv';
import { z } from 'zod';

import logger from './logger.js';

const NodeEnvOptions = ['development', 'production'] as const;
const LogLeveOptions = ['error', 'warn', 'info', 'debug'] as const;

dotenv.config();

const envSchema = z
	.object({
		ALLOWED_ORIGINS: z.string().optional(),
		AUTH_ENABLED: z
			.string()
			.toLowerCase()
			.refine((value) => value === 'true' || value === 'false')
			.default('false'),
		AUTH_PUBLIC_KEY: z.string().default(''),
		DB_HOST: z.string(),
		DB_NAME: z.string(),
		DB_PASSWORD: z.string(),
		DB_PORT: z.coerce.number().min(100),
		DB_USER: z.string(),
		LECTERN_URL: z.string().url(),
		LOG_LEVEL: z.enum(LogLeveOptions).default('info'),
		NODE_ENV: z.enum(NodeEnvOptions).default('development'),
		SERVER_PORT: z.coerce.number().min(100).default(3000),
		SERVER_UPLOAD_LIMIT: z.string().default('10mb'),
	})
	.superRefine((data, ctx) => {
		if (data.AUTH_ENABLED === 'true' && data.AUTH_PUBLIC_KEY.trim() === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['AUTH_PUBLIC_KEY'],
				message: 'AUTH_PUBLIC_KEY is required when AUTH_ENABLED is true',
			});
		}
	});

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
	logger.error(envParsed.error.issues);
	throw new Error('There is an error with the server environment variables.');
}

export const env = envParsed.data;

import dotenv from 'dotenv';
import { z } from 'zod';

const NodeEnvOptions = ['development', 'production'] as const;
const LogLeveOptions = ['error', 'warn', 'info', 'debug'] as const;

dotenv.config();

// Schema for a category:index pairs
const indexerCategoriesMappingSchema = z.string().regex(
	/^(\w+:\w+)(,\w+:\w+)*$/,
	{
		message: "Invalid format. The correct format is 'category:index' pairs separated by commas.",
	}
);

const envSchema = z.object({
	ALLOWED_ORIGINS: z.string().optional(),
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
	INDEXER_ENABLED: z.coerce.boolean().default(true),
	INDEXER_SERVER_URL: z.string().url().optional(),
	INDEXER_MAPPING: indexerCategoriesMappingSchema.optional()
}).refine(data => {
	// If INDEXER_ENABLED is true, INDEXER_SERVER_URL and INDEXER_MAPPING must not be empty
	if (data.INDEXER_ENABLED) {
	  return data.INDEXER_SERVER_URL !== '' && data.INDEXER_MAPPING !== '';
	}
	// If INDEXER_ENABLED is false, both fields can be omitted
	return true; 
  }, {
	message: "When INDEXER_ENABLED is true, both INDEXER_SERVER_URL and INDEXER_MAPPING must be provided and cannot be empty.",
	path: ["INDEXER_SERVER_URL", "INDEXER_MAPPING"]
  });

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
	console.error(envParsed.error.issues);
	throw new Error('There is an error with the server environment variables.');
}

export const env = envParsed.data;

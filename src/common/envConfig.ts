/*
 * Copyright (c) 2025 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

import logger from './logger.js';

const NodeEnvOptions = ['development', 'production'] as const;
const LogLeveOptions = ['error', 'warn', 'info', 'debug'] as const;

const booleanString = z.string().transform((v) => ['true', '1'].includes(v.toLowerCase()));

dotenv.config();

// Schema for a category:index pairs
const indexerCategoriesMappingSchema = z.string().regex(/^(\w+:\w+)(,\w+:\w+)*$/, {
	message: "Invalid format. The correct format is 'category:index' pairs separated by commas.",
});

const envSchema = z
	.object({
		ALLOWED_ORIGINS: z.string().optional(),
		AUDIT_ENABLED: booleanString.default('true'),
		AUTH_ENABLED: booleanString.default('true'),
		AUTH_PERMISSION_ADMIN: z.string().default(''),
		AUTH_PERMISSION_SUFFIX_WRITE_ORG: z.string().default(''),
		AUTH_PUBLIC_KEY: z.string().default(''),
		DB_HOST: z.string(),
		DB_NAME: z.string(),
		DB_PASSWORD: z.string(),
		DB_PORT: z.coerce.number().min(100),
		DB_USER: z.string(),
		ID_USELOCAL: booleanString.default('true'),
		ID_CUSTOMALPHABET: z.string().default('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
		ID_CUSTOMSIZE: z.coerce.number().default(21),
		INDEXER_ENABLED: booleanString.default('true'),
		INDEXER_SERVER_URL: z.string().url().optional(),
		INDEXER_MAPPING: indexerCategoriesMappingSchema.optional(),
		LECTERN_URL: z.string().url(),
		LOG_LEVEL: z.enum(LogLeveOptions).default('info'),
		NODE_ENV: z.enum(NodeEnvOptions).default('development'),
		PLURALIZE_SCHEMAS_ENABLED: booleanString.default('true'),
		SERVER_PORT: z.coerce.number().min(100).default(3000),
		SERVER_UPLOAD_LIMIT: z.string().default('10mb'),
	})
	.superRefine((data, ctx) => {
		if (data.AUTH_ENABLED === true && data.AUTH_PUBLIC_KEY.trim() === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['AUTH_PUBLIC_KEY'],
				message: 'AUTH_PUBLIC_KEY is required when AUTH_ENABLED is true',
			});
		}

		if (
			data.INDEXER_ENABLED === true &&
			(!data.INDEXER_SERVER_URL ||
				data.INDEXER_SERVER_URL.trim() === '' ||
				!data.INDEXER_MAPPING ||
				data.INDEXER_MAPPING.trim() === '')
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['INDEXER_SERVER_URL', 'INDEXER_MAPPING'],
				message:
					'When INDEXER_ENABLED is true, both INDEXER_SERVER_URL and INDEXER_MAPPING must be provided and cannot be empty.',
			});
		}
	});

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
	logger.error(envParsed.error.issues);
	throw new Error('There is an error with the server environment variables.');
}

export const env = envParsed.data;

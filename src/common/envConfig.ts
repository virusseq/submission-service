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

const NodeEnvOptions = ['development', 'production'] as const;
const LogLeveOptions = ['error', 'warn', 'info', 'debug'] as const;

dotenv.config();

// Schema for a category:index pairs
const indexerCategoriesMappingSchema = z.string().regex(/^(\w+:\w+)(,\w+:\w+)*$/, {
	message: "Invalid format. The correct format is 'category:index' pairs separated by commas.",
});

const envSchema = z
	.object({
		ALLOWED_ORIGINS: z.string().optional(),
		AUDIT_ENABLED: z.coerce.boolean().default(true),
		DB_HOST: z.string(),
		DB_NAME: z.string(),
		DB_PASSWORD: z.string(),
		DB_PORT: z.coerce.number().min(100),
		DB_USER: z.string(),
		ID_USELOCAL: z.coerce.boolean().default(true),
		ID_CUSTOMALPHABET: z.string().default('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
		ID_CUSTOMSIZE: z.coerce.number().default(21),
		INDEXER_ENABLED: z.coerce.boolean().default(true),
		INDEXER_SERVER_URL: z.string().url().optional(),
		INDEXER_MAPPING: indexerCategoriesMappingSchema.optional(),
		LECTERN_URL: z.string().url(),
		LOG_LEVEL: z.enum(LogLeveOptions).default('info'),
		NODE_ENV: z.enum(NodeEnvOptions).default('development'),
		PLURALIZE_SCHEMAS_ENABLED: z.coerce.boolean().default(true),
		SERVER_PORT: z.coerce.number().min(100).default(3000),
		SERVER_UPLOAD_LIMIT: z.string().default('10mb'),
	})
	.refine(
		(data) => {
			// If INDEXER_ENABLED is true, INDEXER_SERVER_URL and INDEXER_MAPPING must not be empty
			if (data.INDEXER_ENABLED) {
				return data.INDEXER_SERVER_URL !== '' && data.INDEXER_MAPPING !== '';
			}
			// If INDEXER_ENABLED is false, both fields can be omitted
			return true;
		},
		{
			message:
				'When INDEXER_ENABLED is true, both INDEXER_SERVER_URL and INDEXER_MAPPING must be provided and cannot be empty.',
			path: ['INDEXER_SERVER_URL', 'INDEXER_MAPPING'],
		},
	);

const envParsed = envSchema.safeParse(process.env);

if (!envParsed.success) {
	console.error(envParsed.error.issues);
	throw new Error('There is an error with the server environment variables.');
}

export const env = envParsed.data;

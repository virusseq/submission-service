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
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '@/common/envConfig.js';
import logger from '@/common/logger.js';

import type * as schema from './schemas/index.js';

export type PostgresDb = NodePgDatabase<typeof schema>;

const { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, LOG_LEVEL } = env;

const dbUrl = new URL(`postgres://${DB_HOST}:${DB_PORT}/${DB_NAME}`);
dbUrl.username = DB_USER;
dbUrl.password = DB_PASSWORD;

/**
 * The connection string used to connect to the PostgreSQL database.
 */
export const connectionString = dbUrl.toString();

let pgDatabase: PostgresDb | undefined;

/**
 * Returns the singleton Postgres database instance.
 */
export const getDbInstance = (): PostgresDb => {
	if (!pgDatabase) {
		throw new Error('Not connected to Postgres database');
	}

	return pgDatabase;
};

/**
 * Initializes a connection to the PostgreSQL database and sets up
 * the singleton instance used throughout the application.
 * @param connectionString The Postgres connection string
 */
export const connectToDb = async (connectionString: string) => {
	try {
		const pool = new Pool({
			connectionString,
		});
		const db = drizzle<typeof schema>({ client: pool, logger: LOG_LEVEL === 'debug' });

		pgDatabase = db;
	} catch (err) {
		if (err instanceof Error) {
			logger.error('Error on Database startup:', err.message);
		} else {
			logger.error('Error on Database startup:', String(err));
		}
		throw err;
	}
};

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

import { defineConfig } from 'drizzle-kit';

import { schemaName } from './src/db/schemas/schema.js';

const PG_DATABASE = process.env.DB_NAME;
const PG_USER = process.env.DB_USER;
const PG_PASSWORD = process.env.DB_PASSWORD;
const PG_HOST = process.env.DB_HOST;
const PG_PORT = process.env.DB_PORT;

export const connectionString = `postgres://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;

/**
 * Drizzle ORM configuration for the Submission Service.
 * This configuration is used for **development** to generate migration files using Drizzle Kit.
 * It also connects to the Postgres database to be used with Drizzle Studio
 * @see https://orm.drizzle.team/docs/get-started/postgresql-new#step-5---setup-drizzle-config-file
 */
export default defineConfig({
	out: './migrations',
	schema: ['./src/db/schemas/index.ts'],
	dialect: 'postgresql',
	migrations: {
		schema: `${schemaName}-drizzle`,
	},
	dbCredentials: {
		url: connectionString,
	},
});

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

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from '@/common/envConfig.js';
import logger from '@/common/logger.js';

import { schemaName } from '../db/schemas/schema.js';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const migrationsFolder = path.join(currentDir, '..', '..', 'migrations');

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = env;

const dbUrl = new URL(`postgres://${DB_HOST}:${DB_PORT}/${DB_NAME}`);
dbUrl.username = DB_USER;
dbUrl.password = DB_PASSWORD;

const db = drizzle(dbUrl.toString());

try {
	await migrate(db, {
		migrationsFolder,
		migrationsSchema: `${schemaName}-drizzle`,
	});
} catch (error) {
	logger.error(`Error processing Submission Service migrations. ${error}`);
	process.exit(1);
}

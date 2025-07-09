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

import { env } from '@/common/envConfig.js';
import logger from '@/common/logger.js';
import { connectionString, connectToDb } from '@/db/index.js';
import { app } from '@/server.js';

const { NODE_ENV, SERVER_PORT, INDEXER_ENABLED, AUTH_ENABLED, SEQUENCING_SUBMISSION_ENABLED } = env;

// Initialize the connection to the database
connectToDb(connectionString);

const server = app.listen(SERVER_PORT, () => {
	logger.info('================ Server Startup ================');
	logger.info(`🌍 Environment             : ${NODE_ENV}`);
	logger.info(`📡 Listening on            : http://localhost:${SERVER_PORT}`);
	logger.info(`🧩 Indexer                 : ${INDEXER_ENABLED ? 'Enabled' : 'Disabled'}`);
	logger.info(`🔐 Authentication          : ${AUTH_ENABLED ? 'Enabled' : 'Disabled'}`);
	logger.info(`🧬 Sequencing Submission   : ${SEQUENCING_SUBMISSION_ENABLED ? 'Enabled' : 'Disabled'}`);

	if (NODE_ENV === 'development') {
		logger.info(`📖 Swagger Docs            : http://localhost:${SERVER_PORT}/api-docs`);
	}

	logger.info('===============================================');
});

const onCloseSignal = () => {
	logger.info('sigint received, shutting down');
	server.close(() => {
		logger.info('server closed');
		process.exit();
	});
	setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

process.on('SIGINT', onCloseSignal);
process.on('SIGTERM', onCloseSignal);

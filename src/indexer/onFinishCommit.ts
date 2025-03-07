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

import { join as joinPath } from 'node:path/posix';
import { setTimeout } from 'node:timers/promises';

import type { ResultOnCommit, SubmittedDataResponse } from '@overture-stack/lyric';

import { logger } from '@/common/logger.js';

import { env } from '../common/envConfig.js';

const findCategoryMapping = (mappings: string | undefined, categoryId: string) => {
	return mappings
		?.split(',')
		.map((mapping) => mapping.split(':'))
		.find((pair) => pair[0] === categoryId);
};

const indexRecords = async (recordsToIndex: SubmittedDataResponse[], fullUrl: URL, path: string) => {
	for (const record of recordsToIndex) {
		fullUrl.pathname = joinPath(path, record.systemId);

		try {
			const response = await fetch(fullUrl, {
				method: 'POST',
			});
			if (!response.ok) {
				logger.error(`HTTP error! Status: ${response.status}`);
			}
			await setTimeout(500);
		} catch (error) {
			logger.error(`Error Indexing server ${fullUrl}`);
			logger.error(error);
		}
	}
};

export const onFinishCommitCallback = (resultOnCommit: ResultOnCommit) => {
	const { categoryId, organization, data } = resultOnCommit;

	// Return if indexer is disabled
	if (!env.INDEXER_ENABLED || !env.INDEXER_SERVER_URL) return;

	const mapping = findCategoryMapping(env.INDEXER_MAPPING, categoryId.toString());

	if (!mapping || !mapping[1]) {
		logger.info(`No index configuration exists for category ${categoryId}`);
		return;
	}

	const repoCode = mapping[1];
	const fullUrl = new URL(env.INDEXER_SERVER_URL);
	const path = joinPath('index/repository', repoCode, 'organization', organization, 'id');

	logger.info(
		`Records to index: inserts:${data?.inserts.length}, updates:${data?.updates.length}, deletes: ${data?.deletes.length}`,
	);

	const recordsToIndex = data?.inserts.concat(data?.updates).concat(data?.deletes);

	if (recordsToIndex?.length) {
		indexRecords(recordsToIndex, fullUrl, path);
	}
};

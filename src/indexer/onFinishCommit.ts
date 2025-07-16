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

import { env } from '@/common/envConfig.js';
import logger from '@/common/logger.js';
import { getDbInstance } from '@/db/index.js';
import { fileRepository } from '@/repository/fileRepository.js';
import { fetchSubmissionFilesBySubmissionId } from '@/service/fileService.js';

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

/**
 * Updates the `system_id` field of submission files associated with a submission in the database,
 * @param submissionId The ID of the submission
 * @param submittedData Array of submitted data records with associated system IDs
 * @returns
 */
const updateSubmissionFileSystemIdsIfNeeded = async (submissionId: number, submittedData: SubmittedDataResponse[]) => {
	// Get files associated to the Submission
	const identifierColumnName = env.SEQUENCING_SUBMISSION_FILENAME_IDENTIFIER_COLUMN || '';
	const isSequencingEnabled = env.SEQUENCING_SUBMISSION_ENABLED;

	if (!identifierColumnName || !isSequencingEnabled || !submittedData.length) {
		return;
	}

	const existingSubmissionFiles = await fetchSubmissionFilesBySubmissionId(submissionId);
	if (!existingSubmissionFiles.length) {
		logger.debug(`Submission '${submissionId}' does not have any files associated`);
		return;
	}

	const db = getDbInstance();
	const fileRepo = fileRepository(db);

	await Promise.all(
		submittedData.map(async (submittedRecord) => {
			const submittedRecordIdentifier = submittedRecord.data[identifierColumnName];
			const matchedSubmissionFile = existingSubmissionFiles.find(
				(file) => file.record_identifier === submittedRecordIdentifier,
			);
			if (matchedSubmissionFile) {
				await fileRepo.updateSubmissionFiles(matchedSubmissionFile.id, { system_id: submittedRecord.systemId });
			}
		}),
	);
};

/**
 * This function is executed automatically when a commit event is completed
 *
 * This function performs two main post-processing tasks:
 *
 * 1. **Update Submission File System IDs**:
 *    If sequencing is enabled, it updates the `system_id` of the submission file records associated to
 *    the submission
 *
 * 2. **Trigger Record Indexing**:
 *    If the indexing feature is enabled, it request to the indexer service to index
 *    the inserted, updated, and deleted records associated to the submission.
 * @param resultOnCommit The result payload from the commit event
 * @returns
 */
export const onFinishCommitCallback = async (resultOnCommit: ResultOnCommit) => {
	const { categoryId, organization, data, submissionId } = resultOnCommit;

	if (data?.inserts) {
		// records to update the submission files mapping
		await updateSubmissionFileSystemIdsIfNeeded(submissionId, data?.inserts);
	}

	// Return if indexer is disabled
	if (!env.INDEXER_ENABLED || !env.INDEXER_SERVER_URL) {
		return;
	}

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

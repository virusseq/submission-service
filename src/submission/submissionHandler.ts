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

import { BATCH_ERROR_TYPE, type BatchError, CREATE_SUBMISSION_STATUS, type Schema } from '@overture-stack/lyric';

import { env } from '@/common/envConfig.js';
import logger from '@/common/logger.js';
import { lyricProvider } from '@/core/provider.js';
import { submit as songSubmit } from '@/submission/song.js';
import type { SequencingMetadataType } from '@/submission/submitRequest.js';

import { buildFileMetadata, buildSequencingFilesMetadata } from './fileValidation.js';
import { convertRecordToPayload, prefixKeys } from './populateTemplate.js';
import { parseFileToRecords } from './readFile.js';

interface SuccessSubmissionResult {
	success: true;
	submissionId: number;
}

interface ErrorSubmissionResult {
	success: false;
	submissionId?: number;
	errors: BatchError[];
}

// This template is used to convert the sequencing metadata into a payload to Song
const SEQUENCING_TEMPLATE = 'sequencing_payload.json' as const;
const DATA_PREFIX = 'data.' as const;

/**
 * Handles the submission of a file and its associated metadata
 * Parses, validates and submit the Submission file and sequencing metadata if present
 * @param param0
 * @returns
 */
export async function handleSubmission({
	submissionFile,
	sequencingMetadataValues,
	organization,
	entityName,
	categoryId,
	username,
	schema,
}: {
	submissionFile: Express.Multer.File;
	sequencingMetadataValues: SequencingMetadataType[] | null;
	organization: string;
	entityName: string;
	categoryId: number;
	username: string;
	schema: Schema;
}): Promise<SuccessSubmissionResult | ErrorSubmissionResult> {
	const extractedData = await parseFileToRecords(submissionFile, schema);
	const songSubmissionData = [];

	// Build Sequencing metadata
	if (sequencingMetadataValues) {
		const { errors, validFiles: sequencingFilesMetadata } = buildSequencingFilesMetadata(
			sequencingMetadataValues,
			extractedData,
			submissionFile.originalname,
		);

		if (errors.length > 0) {
			logger.info(`Error validation sequencing file metadata: ${JSON.stringify(errors)}`);
			return {
				success: false,
				errors,
			};
		}

		// Convert Sequencing metadata to payload
		const fileNameIdentifier = env.SEQUENCING_SUBMISSION_FILENAME_IDENTIFIER_COLUMN;
		const sequencingEnabled = env.SEQUENCING_SUBMISSION_ENABLED;
		if (fileNameIdentifier && sequencingEnabled) {
			for (const filesMetadata of sequencingFilesMetadata) {
				const matchedRecord = extractedData.find((record) => record[fileNameIdentifier] === filesMetadata.identifier);

				if (!matchedRecord) {
					continue;
				}

				const prefixedRecord = prefixKeys(matchedRecord, DATA_PREFIX);
				const songPayload = convertRecordToPayload({ organization, ...prefixedRecord }, SEQUENCING_TEMPLATE);
				// TODO: Handle multiple files by same identifier
				songPayload.files = [buildFileMetadata(filesMetadata)];

				songSubmissionData.push(songPayload);
			}
		}
	}

	// Lyric Submission
	const uploadResult = await lyricProvider.services.submission.submit({
		records: extractedData,
		entityName,
		categoryId,
		organization,
		username,
	});

	if (uploadResult.status !== CREATE_SUBMISSION_STATUS.PROCESSING || !uploadResult.submissionId) {
		return {
			success: false,
			errors: [
				{
					message: uploadResult.description,
					type: BATCH_ERROR_TYPE.INCORRECT_SECTION,
					batchName: submissionFile.originalname,
				},
			],
		};
	}

	// Submit individual song data
	const songErrors = [];
	for (const record of songSubmissionData) {
		try {
			const result = await songSubmit(organization, record);
			logger.info(
				`Song submission result: ${result.status} - ${result.analysisId}, submissionId: ${uploadResult.submissionId}`,
			);
		} catch (error) {
			songErrors.push({
				message: error?.toString() || 'Unknown error',
				type: BATCH_ERROR_TYPE.INCORRECT_SECTION,
				batchName: submissionFile.originalname,
			});
		}
	}

	if (songErrors.length > 0) {
		// Lyric submission was successful, but song submission failed
		// Should we cancel the submission?
		return {
			success: false,
			submissionId: uploadResult.submissionId,
			errors: songErrors,
		};
	}
	// Successful submission!
	return {
		success: true,
		submissionId: uploadResult.submissionId,
	};
}

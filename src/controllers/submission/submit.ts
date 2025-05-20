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

import { type Response } from 'express';

import { BATCH_ERROR_TYPE, type BatchError, CREATE_SUBMISSION_STATUS } from '@overture-stack/lyric';

import { hasUserWriteAccess, shouldBypassAuth } from '@/common/auth.js';
import logger from '@/common/logger.js';
import { lyricProvider } from '@/core/provider.js';
import { validateRequest } from '@/middleware/requestValidation.js';
import { prevalidateNewDataFile, validateSequencingFilesMetadata } from '@/submission/fileValidation.js';
import { parseFileToRecords } from '@/submission/readFile.js';
import { type ErrorResponse, submitRequestSchema, type SubmitResponse } from '@/submission/submitRequest.js';
import { parseSequencingMetadata } from '@/utils/file.js';

export const submit = validateRequest(
	submitRequestSchema,
	async (req, res: Response<SubmitResponse | ErrorResponse>) => {
		const categoryId = Number(req.params.categoryId);
		const entityName = req.body.entityName;
		const submissionFile = req.file;
		const organization = req.body.organization;
		const sequencingMetadataValues = parseSequencingMetadata(req.body.sequencingMetadata || '');
		const user = req.user;

		logger.info(
			`Upload Submission Request: 
			categoryId: '${categoryId}', entityName: '${entityName}', organization: '${organization}', 
			submissionFile: '${submissionFile?.originalname}', sequencingMetadataValues: '${sequencingMetadataValues?.length}'`,
		);

		// Authorization check
		if (!shouldBypassAuth(req.method) && !hasUserWriteAccess(organization, user)) {
			return res.status(403).json({
				error: 'Forbidden',
				message: `User is not authorized to submit data to '${organization}'`,
			});
		}

		if (!submissionFile) {
			throw new lyricProvider.utils.errors.BadRequest(
				'The "submissionFile" parameter is missing or empty. Please include a file in the request for processing.',
			);
		}

		// Get the current dictionary and validate entity name
		const currentDictionary = await getDictionary(categoryId);
		const schema = validateEntityName(currentDictionary, entityName);

		const username = user?.username || '';

		const { file: prevalidatedFile, error } = await prevalidateNewDataFile(submissionFile, schema);
		if (error) {
			return respondWithInvalidSubmission(res, undefined, [error]);
		}

		const extractedData = await parseFileToRecords(prevalidatedFile, schema);

		// Validate if sequencing metadata is provided
		if (sequencingMetadataValues) {
			const { errors } = validateSequencingFilesMetadata(
				sequencingMetadataValues,
				extractedData,
				submissionFile.originalname,
			);
			if (errors.length > 0) {
				console.log(`error validation sequencing file: ${JSON.stringify(errors)}`);
				return respondWithInvalidSubmission(res, undefined, errors);
			}
		}

		// Submit data using Lyric service
		const uploadResult = await lyricProvider.services.submission.submit({
			records: extractedData,
			entityName,
			categoryId,
			organization,
			username,
		});

		if (uploadResult.status === CREATE_SUBMISSION_STATUS.PROCESSING && uploadResult.submissionId) {
			return responseWithProcessingStatus(res, uploadResult.submissionId);
		} else {
			return respondWithInvalidSubmission(res, uploadResult.submissionId, [
				{
					message: uploadResult.description,
					type: BATCH_ERROR_TYPE.INCORRECT_SECTION,
					batchName: submissionFile.originalname,
				},
			]);
		}
	},
);

/**
 * Retrieves the dictionary for the given category ID.
 * @param categoryId - The ID of the category to retrieve the dictionary for.
 * @returns The current dictionary for the specified category ID.
 */
const getDictionary = async (categoryId: number) => {
	const currentDictionary = await lyricProvider.services.dictionary.getActiveDictionaryByCategory(categoryId);
	if (!currentDictionary) {
		throw new lyricProvider.utils.errors.BadRequest(`Dictionary in category '${categoryId}' not found`);
	}
	return currentDictionary;
};

/**
 * Validates the entity name against the dictionary
 * @param dictionary - Dictionary object containing the schemas
 * @param entityName - Request parameter for the entity name
 * @returns The schema object if valid, otherwise throws an error
 * @throws BadRequest if the entity name is invalid
 */
const validateEntityName = (dictionary: any, entityName: string) => {
	const schema = dictionary.dictionary.find((schema: any) => schema.name.toLowerCase() === entityName.toLowerCase());
	if (!schema) {
		throw new lyricProvider.utils.errors.BadRequest(`Invalid entity name for submission`);
	}
	return schema;
};

/**
 * Responds with an invalid submission status.
 * @param res - The response object
 * @param submissionId - The submission ID
 * @param errors - The array of batch errors
 * @returns The response object with the invalid submission status
 */
const respondWithInvalidSubmission = (
	res: Response<SubmitResponse>,
	submissionId: number | undefined,
	errors: BatchError[],
): Response<SubmitResponse> => {
	return res.status(200).send({
		submissionId,
		status: CREATE_SUBMISSION_STATUS.INVALID_SUBMISSION,
		batchErrors: errors,
	});
};

/**
 * Response with a processing status
 * @param res - The response object
 * @param submissionId - The submission ID
 * @returns The response object with the processing status
 */
const responseWithProcessingStatus = (
	res: Response<SubmitResponse>,
	submissionId: number,
): Response<SubmitResponse> => {
	return res.status(200).send({
		submissionId,
		status: CREATE_SUBMISSION_STATUS.PROCESSING,
		batchErrors: [],
	});
};

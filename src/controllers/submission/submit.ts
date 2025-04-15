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

import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { z } from 'zod';

import { BATCH_ERROR_TYPE, type BatchError } from '@overture-stack/lyric';

import { hasUserWriteAccess, shouldBypassAuth } from '@/common/auth.js';
import logger from '@/common/logger.js';
import { lyricProvider } from '@/core/provider.js';
import { type RequestValidation, validateRequest } from '@/middleware/requestValidation.js';
import { prevalidateNewDataFile } from '@/submission/fileValidation.js';
import { parseFileToRecords } from '@/submission/readFile.js';

interface SubmitRequestPathParams extends ParamsDictionary {
	categoryId: string;
}

export const submitRequestSchema: RequestValidation<{ organization: string }, ParsedQs, SubmitRequestPathParams> = {
	body: z.object({
		organization: z.string(),
	}),
	pathParams: z.object({
		categoryId: z.string(),
	}),
};

const CREATE_SUBMISSION_STATUS = {
	PROCESSING: 'PROCESSING',
	INVALID_SUBMISSION: 'INVALID_SUBMISSION',
	PARTIAL_SUBMISSION: 'PARTIAL_SUBMISSION',
} as const;

export const submit = validateRequest(submitRequestSchema, async (req, res) => {
	const categoryId = Number(req.params.categoryId);
	const files = Array.isArray(req.files) ? req.files : [];
	const organization = req.body.organization;
	const user = req.user;

	logger.info(
		`Upload Submission Request: categoryId '${categoryId}'`,
		` organization '${organization}'`,
		` files: '${files?.map((f) => f.originalname)}'`,
	);

	if (!shouldBypassAuth(req.method) && !hasUserWriteAccess(organization, user)) {
		return res.status(403).json({
			error: 'Forbidden',
			message: `User is not authorized to submit data to '${organization}'`,
		});
	}

	if (!files || files.length == 0) {
		throw new lyricProvider.utils.errors.BadRequest(
			'The "files" parameter is missing or empty. Please include files in the request for processing.',
		);
	}

	// get the current dictionary
	const currentDictionary = await lyricProvider.services.dictionary.getActiveDictionaryByCategory(categoryId);

	if (!currentDictionary) {
		throw new lyricProvider.utils.errors.BadRequest(`Dictionary in category '${categoryId}' not found`);
	}

	const username = user?.username || '';

	const fileErrors: BatchError[] = [];
	let submissionId: number | undefined;
	const entityList: string[] = [];

	for (const file of files) {
		try {
			// // validate if entity name is present in the dictionary
			const entityName = file.originalname.split('.')[0]?.toLowerCase();
			const schema = currentDictionary.dictionary.find((schema) => schema.name.toLowerCase() === entityName);
			if (!schema || !entityName) {
				fileErrors.push({
					type: BATCH_ERROR_TYPE.INVALID_FILE_NAME,
					message: `Invalid entity name for submission`,
					batchName: file.originalname,
				});
				continue;
			}

			const { file: prevalidatedFile, error } = await prevalidateNewDataFile(file, schema);
			if (error) {
				fileErrors.push(error);
				continue;
			}

			const extractedData = await parseFileToRecords(prevalidatedFile, schema);

			const uploadResult = await lyricProvider.services.submission.submit({
				records: extractedData,
				entityName,
				categoryId,
				organization,
				username,
			});

			submissionId = uploadResult.submissionId;
			entityList.push(entityName);
		} catch (error) {
			logger.error(`Error processing file`, error);
		}
	}

	let status: string = CREATE_SUBMISSION_STATUS.PROCESSING;
	if (entityList.length === 0) {
		logger.info('Unable to process the submission');
		status = CREATE_SUBMISSION_STATUS.INVALID_SUBMISSION;
	} else if (fileErrors.length > 0) {
		logger.info('Submission processed with some errors');
		status = CREATE_SUBMISSION_STATUS.PARTIAL_SUBMISSION;
	} else {
		logger.info(`Submission processed successfully`);
	}

	// This response provides the details of file Submission
	return res.status(200).send({ submissionId, status, batchErrors: fileErrors, inProcessEntities: entityList });
});

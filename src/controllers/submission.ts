import { BATCH_ERROR_TYPE, type BatchError } from '@overture-stack/lyric';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { z } from 'zod';

import { logger } from '@/common/logger.js';
import { lyricProvider } from '@/core/provider.js';
import { type RequestValidation, validateRequest } from '@/middleware/requestValidation.js';
import { prevalidateUploadedFile } from '@/submission/fileValidation.js';
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

	// TODO: get userName from auth
	const userName = '';

	logger.info(
		`Upload Submission Request: categoryId '${categoryId}'`,
		` organization '${organization}'`,
		` files: '${files?.map((f) => f.originalname)}'`,
	);

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

			const { file: prevalidatedFile, error } = await prevalidateUploadedFile(file, schema);
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
				userName,
			});

			submissionId = uploadResult.submissionId;
			entityList.push(entityName);
		} catch (error) {
			logger.error(`Error processing file`, error);
		}
	}

	let status: string = CREATE_SUBMISSION_STATUS.PROCESSING;
	if (fileErrors.length == 0) {
		logger.info(`Submission uploaded successfully`);
	} else if (files.length === entityList.length) {
		logger.info('Failed to process this request');
		status = CREATE_SUBMISSION_STATUS.INVALID_SUBMISSION;
	} else {
		logger.info('Found some errors processing this request');
		status = CREATE_SUBMISSION_STATUS.PARTIAL_SUBMISSION;
	}

	// This response provides the details of file Submission
	return res.status(200).send({ submissionId, status, batchErrors: fileErrors, inProcessEntities: entityList });
});

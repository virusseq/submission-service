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
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { z } from 'zod';

import type { SubmissionResponse } from '@overture-stack/lyric';

import { shouldBypassAuth } from '@/common/auth.js';
import logger from '@/common/logger.js';
import { lyricProvider } from '@/core/provider.js';
import { type RequestValidation, validateRequest } from '@/middleware/requestValidation.js';
import { buildSubmissionFileMetadata } from '@/service/fileService.js';
import type { ErrorResponse } from '@/submission/submitRequest.js';

interface GetSubmissionRequestPathParams extends ParamsDictionary {
	submissionId: string;
}

export const getSubmissionByIdRequestSchema: RequestValidation<object, ParsedQs, GetSubmissionRequestPathParams> = {
	pathParams: z.object({
		submissionId: z.string(),
	}),
};

export type FileMetadata = {
	objectId: string;
	fileName: string;
	md5Sum: string;
	isUploaded: boolean;
};

export type GetSubmissionResponse = {
	files: FileMetadata[];
} & SubmissionResponse;

/**
 * Handles the request to get a submission by its ID.
 * Includes an array of files associated with the submission.
 */
export const getSubmissionById = validateRequest(
	getSubmissionByIdRequestSchema,
	async (req, res: Response<GetSubmissionResponse | ErrorResponse>, next) => {
		const submissionId = Number(req.params.submissionId);

		logger.info(`Request Get Submission ID '${submissionId}'`);

		// Authorization check
		if (!shouldBypassAuth(req.method)) {
			return res.status(403).json({
				error: 'Forbidden',
				message: `User is not authorized to get submission with id '${submissionId}'`,
			});
		}
		try {
			const submission = await lyricProvider.services.submission.getSubmissionById(submissionId);

			if (!submission) {
				throw new lyricProvider.utils.errors.NotFound(`Submission with id '${submissionId}' not found`);
			}

			const files = await buildSubmissionFileMetadata(submission.organization, submissionId);

			const result: GetSubmissionResponse = {
				...submission,
				files,
			};

			return res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	},
);

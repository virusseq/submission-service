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

import { convertToViewType, type SubmittedDataResponse, VIEW_TYPE } from '@overture-stack/lyric';

import logger from '@/common/logger.js';
import { viewSchema } from '@/common/validation.ts/common.js';
import { lyricProvider } from '@/core/provider.js';
import { type RequestValidation, validateRequest } from '@/middleware/requestValidation.js';
import type { SubmissionManifest } from '@/submission/submitRequest.js';

interface getDataPathParams extends ParamsDictionary {
	categoryId: string;
	systemId: string;
}

interface getDataQueryParams extends ParsedQs {
	view?: string;
}

const RequestSchema: RequestValidation<object, getDataQueryParams, getDataPathParams> = {
	query: z.object({
		view: viewSchema.optional(),
	}),
	pathParams: z.object({
		categoryId: z.string(),
		systemId: z.string(),
	}),
};

type SubmittedDataWithFilesResponse = SubmittedDataResponse & {
	files?: SubmissionManifest[];
};

// Default values for this endpoint
const defaultView = VIEW_TYPE.Values.flat;

export const bySystemId = validateRequest(
	RequestSchema,
	async (req, res: Response<SubmittedDataWithFilesResponse>, next) => {
		try {
			const categoryId = Number(req.params.categoryId);
			const systemId = req.params.systemId;

			const view = convertToViewType(String(req.query.view)) || defaultView;

			logger.info(
				'Request Submitted Data',
				`categoryId '${categoryId}'`,
				`systemId '${systemId}'`,
				`params: view '${view}'`,
			);

			const submittedDataResult = await lyricProvider.services.submittedData.getSubmittedDataBySystemId(
				categoryId,
				systemId,
				{
					view,
				},
			);

			if (submittedDataResult.metadata.errorMessage) {
				throw new lyricProvider.utils.errors.NotFound(submittedDataResult.metadata.errorMessage);
			}

			if (!submittedDataResult.result) {
				throw new lyricProvider.utils.errors.InternalServerError('Invalid Response');
			}

			// TODO: include files in this response
			const responseWithFiles: SubmittedDataWithFilesResponse = { ...submittedDataResult.result };

			return res.status(200).send(responseWithFiles);
		} catch (error) {
			next(error);
		}
	},
);

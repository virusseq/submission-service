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
import { z as zod } from 'zod';

import { convertToViewType, VIEW_TYPE } from '@overture-stack/lyric';

import logger from '@/common/logger.js';
import {
	entityNameSchema,
	type paginationQueryParams,
	paginationQuerySchema,
	viewSchema,
} from '@/common/validation.ts/common.js';
import { lyricProvider } from '@/core/provider.js';
import { type RequestValidation, validateRequest } from '@/middleware/requestValidation.js';
import {
	addAnalysisFilesToSubmittedRecord,
	type SubmittedDataPaginatedWithFilesResponse,
	type SubmittedDataWithFilesResponse,
} from '@/submitted-data/submissionFileMapping.js';
import { asArray } from '@/utils/format.js';

export interface dataQueryParams extends paginationQueryParams {
	entityName?: string | string[];
	view?: string;
}

interface getDataPathParams extends ParamsDictionary {
	categoryId: string;
}

const RequestSchema: RequestValidation<object, dataQueryParams, getDataPathParams> = {
	query: zod
		.object({
			entityName: zod.union([entityNameSchema, entityNameSchema.array()]).optional(),
			view: viewSchema.optional(),
		})
		.merge(paginationQuerySchema)
		.superRefine((data, ctx) => {
			if (data.view === VIEW_TYPE.Values.compound && data.entityName && data.entityName?.length > 0) {
				ctx.addIssue({
					code: zod.ZodIssueCode.custom,
					message: 'is incompatible with `compound` view',
					path: ['entityName'],
				});
			}
		}),
	pathParams: zod.object({
		categoryId: zod.string(),
	}),
};

// Default values for this endpoint
const defaultPage = 1;
const defaultPageSize = 20;
const defaultView = VIEW_TYPE.Values.flat;

export const byCategory = validateRequest(
	RequestSchema,
	async (req, res: Response<SubmittedDataPaginatedWithFilesResponse>, next) => {
		try {
			const categoryId = Number(req.params.categoryId);

			// query params
			const entityName = asArray(req.query.entityName || []);
			const page = parseInt(String(req.query.page)) || defaultPage;
			const pageSize = parseInt(String(req.query.pageSize)) || defaultPageSize;
			const view = convertToViewType(req.query.view) || defaultView;

			logger.info(
				`Request Submitted Data on categoryId '${categoryId}'` +
				` pagination params: page '${page}' pageSize '${pageSize}'` +
				` view '${view}'`,
			);

			const submittedDataResult = await lyricProvider.services.submittedData.getSubmittedDataByCategory(
				categoryId,
				{ page, pageSize },
				{ entityName, view },
			);

			if (submittedDataResult.metadata.errorMessage) {
				throw new lyricProvider.utils.errors.NotFound(submittedDataResult.metadata.errorMessage);
			}

			const recordsWithFiles: SubmittedDataWithFilesResponse[] = await Promise.all(
				submittedDataResult.result.map((record) => addAnalysisFilesToSubmittedRecord(record)),
			);

			const response: SubmittedDataPaginatedWithFilesResponse = {
				pagination: {
					currentPage: page,
					pageSize: pageSize,
					totalPages: Math.ceil(submittedDataResult.metadata.totalRecords / pageSize),
					totalRecords: submittedDataResult.metadata.totalRecords,
				},
				records: recordsWithFiles,
			};

			return res.status(200).send(response);
		} catch (error) {
			next(error);
		}
	},
);

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
import { z, ZodError } from 'zod';

import type { BatchError } from '@overture-stack/lyric';

import logger from '@/common/logger.js';
import type { RequestValidation } from '@/middleware/requestValidation.js';

interface SubmitRequestPathParams extends ParamsDictionary {
	categoryId: string;
}
export const sequencingMetadataSchema = z.array(
	z.object({
		fileName: z.string(),
		fileSize: z.coerce.number(),
		fileMd5sum: z.string(),
		fileAccess: z.string(),
		fileType: z.string(),
	}),
);
export type SequencingMetadataType = z.infer<typeof sequencingMetadataSchema>;

export const submitRequestSchema: RequestValidation<
	{ entityName: string; organization: string; sequencingMetadata?: string },
	ParsedQs,
	SubmitRequestPathParams
> = {
	body: z.object({
		entityName: z.string(),
		organization: z.string(),
		sequencingMetadata: z
			.string()
			.superRefine((str, ctx) => {
				let parsed = '';
				try {
					parsed = JSON.parse(str);
				} catch (e) {
					logger.error('Invalid JSON format', e);
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Invalid JSON format',
					});
					return;
				}

				const result = sequencingMetadataSchema.safeParse(parsed);
				if (!result.success) {
					logger.error(`zod error: ${result.error}`);
					if (result.error instanceof ZodError) {
						const errorMessages = result.error.errors
							.map((issue) => `${issue.path.join('.')} is ${issue.message}`)
							.join(' | ');

						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: errorMessages,
						});
					} else {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `Invalid JSON format. ${result.error}`,
						});
					}
				}
			})
			.optional(),
	}),
	pathParams: z.object({
		categoryId: z.string(),
	}),
};

export const CREATE_SUBMISSION_STATUS = {
	PROCESSING: 'PROCESSING',
	INVALID_SUBMISSION: 'INVALID_SUBMISSION',
} as const;

export type ErrorResponse = {
	error: string;
	message: string;
};

export type SubmitResponse = {
	submissionId?: number;
	status: 'PROCESSING' | 'INVALID_SUBMISSION';
	batchErrors: BatchError[];
};

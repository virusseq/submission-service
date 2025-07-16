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

import { type CommitSubmissionResult, SUBMISSION_STATUS } from '@overture-stack/lyric';

import { hasUserWriteAccess, shouldBypassAuth } from '@/common/auth.js';
import logger from '@/common/logger.js';
import { lyricProvider } from '@/core/provider.js';
import { type RequestValidation, validateRequest } from '@/middleware/requestValidation.js';
import { publishMappedSubmissionFiles } from '@/service/fileService.js';

interface CommitPathParams extends ParamsDictionary {
	submissionId: string;
	categoryId: string;
}

export const CommitRequestSchema: RequestValidation<object, ParsedQs, CommitPathParams> = {
	pathParams: z.object({
		categoryId: z.string(),
		submissionId: z.string(),
	}),
};

export const commit = validateRequest(CommitRequestSchema, async (req, res: Response<CommitSubmissionResult>, next) => {
	try {
		const categoryId = Number(req.params.categoryId);
		const submissionId = Number(req.params.submissionId);
		const user = req.user;

		logger.info(`Request Commit Active Submission '${submissionId}' on category '${categoryId}`);

		const submission = await lyricProvider.services.submission.getSubmissionById(submissionId);

		if (!submission) {
			throw new lyricProvider.utils.errors.BadRequest(`Submission '${submissionId}' not found`);
		}

		// Authorization check
		if (!shouldBypassAuth(req.method) && !hasUserWriteAccess(submission.organization, user)) {
			throw new lyricProvider.utils.errors.Forbidden(
				`User is not authorized to commit the submission from '${submission.organization}'`,
			);
		}

		if (submission.status !== SUBMISSION_STATUS.VALID) {
			throw new lyricProvider.utils.errors.StatusConflict(
				`Submission does not have status VALID and cannot be committed`,
			);
		}

		const resultPublishSubmissionFiles = await publishMappedSubmissionFiles(submission.organization, submission.id);

		if (!resultPublishSubmissionFiles.success) {
			throw new lyricProvider.utils.errors.StatusConflict(
				`Cannot commit submission. Files with analysis IDs ${resultPublishSubmissionFiles.failed} are missing in object storage`,
			);
		}

		const username = user?.username || '';

		const commitSubmission = await lyricProvider.services.submission.commitSubmission(
			categoryId,
			submissionId,
			username,
		);

		return res.status(200).send(commitSubmission);
	} catch (error) {
		next(error);
	}
});

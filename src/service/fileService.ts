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

import type { FileMetadata } from '@/controllers/submission/getSubmissionById.js';
import { getDbInstance } from '@/db/index.js';
import { fileRepository } from '@/repository/fileRepository.js';
import { getAnalysisById } from '@/submission/song.js';

/**
 * Retrieves the files associated with a submission.
 * @param organization
 * @param submissionId
 * @returns
 */
export const getSubmissionFiles = async (organization: string, submissionId: number) => {
	const db = getDbInstance();
	const { getSubmissionFilesBySubmissionId } = fileRepository(db);
	const submissionFiles = await getSubmissionFilesBySubmissionId(submissionId);

	const fileMetadata: FileMetadata[] = [];

	for (const file of submissionFiles) {
		const analysis = await getAnalysisById(organization, file.submission_id.toString());

		const analysisFile = analysis.files[0];
		if (!analysisFile) {
			continue;
		}

		fileMetadata.push({
			objectId: analysisFile.objectId,
			fileName: analysisFile.fileName,
			md5Sum: analysisFile.fileMd5sum,
			isUploaded: analysis.analysisState === 'PUBLISHED', // Assuming a file is considered uploaded if the analysis is published
		});
	}
	return fileMetadata;
};

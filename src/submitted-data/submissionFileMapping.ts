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

import type { PaginationMetadata, SubmittedDataResponse } from '@overture-stack/lyric';

import { fetchSubmissionFilesBySystemId } from '@/service/fileService.js';
import { getAnalysisFilesByAnalysisId } from '@/submission/song.js';
import type { SubmissionManifest } from '@/submission/submitRequest.js';

export type SubmittedDataPaginatedWithFilesResponse = {
	pagination: PaginationMetadata;
	records: SubmittedDataWithFilesResponse[];
};

export type SubmittedDataWithFilesResponse = SubmittedDataResponse & {
	files?: SubmissionManifest[];
};

/**
 * Includes in submitted record the associated analysis files
 *
 * @param record - The submitted data record.
 * @returns A new record with a `files` property if related analysis files are found.
 */
export const addAnalysisFilesToSubmittedRecord = async (
	record: SubmittedDataResponse,
): Promise<SubmittedDataWithFilesResponse> => {
	const mappingFile = await fetchSubmissionFilesBySystemId(record.systemId);

	if (!mappingFile) {
		// No matching submission file; return original record as is
		return record;
	}

	const analysisFiles = await getAnalysisFilesByAnalysisId(record.organization, mappingFile.analysis_id);

	const resultFiles: SubmissionManifest[] = analysisFiles.map((file) => ({
		objectId: file.objectId,
		fileName: file.fileName,
		md5Sum: file.fileMd5sum,
	}));

	return {
		...record,
		files: resultFiles,
	};
};

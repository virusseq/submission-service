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

import { BATCH_ERROR_TYPE, type BatchError, type Schema } from '@overture-stack/lyric';
import bytes from 'bytes';

import { getSeparatorCharacter } from './format.js';
import { readHeaders } from './readFile.js';

export const prevalidateUploadedFile = async (
	file: Express.Multer.File,
	schema: Schema,
): Promise<{ error?: BatchError; file: Express.Multer.File }> => {
	// check if extension is supported
	const separatorCharacter = getSeparatorCharacter(file.originalname);
	if (!separatorCharacter) {
		return {
			error: {
				type: BATCH_ERROR_TYPE.INVALID_FILE_EXTENSION,
				message: `Invalid file extension ${file.originalname.split('.')[1]}`,
				batchName: file.originalname,
			},
			file,
		};
	}

	const firstLine = await readHeaders(file);
	const fileHeaders = firstLine.split(separatorCharacter);

	const missingRequiredFields = schema.fields
		.filter((field) => field.restrictions && 'required' in field.restrictions) // filter required fields
		.map((field) => field.meta?.displayName?.toString() || field.name) // map displayName if exists
		.filter((fieldName) => !fileHeaders.includes(fieldName));
	if (missingRequiredFields.length > 0) {
		return {
			error: {
				type: BATCH_ERROR_TYPE.MISSING_REQUIRED_HEADER,
				message: `Missing required fields '${JSON.stringify(missingRequiredFields)}'`,
				batchName: file.originalname,
			},
			file,
		};
	}
	return { file };
};

export function getSizeInBytes(size: string | number): number {
	// Parse the string value into an integer in bytes.
	// If value is a number it is assumed is in bytes.
	return bytes.parse(size) || 0;
}

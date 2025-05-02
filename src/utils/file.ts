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

import logger from '@/common/logger.js';
import { sequencingMetadataSchema } from '@/submission/submitRequest.js';

/**
 * Finds the SRA from a given file name
 * @param fullFileName The full file name including extension.
 * @returns
 */
export const getSRAFromFileName = (fullFileName: string): string => {
	if (!fullFileName) {
		return '';
	}

	const [baseName] = fullFileName.split('.');
	if (!baseName) {
		return '';
	}

	const [sra] = baseName.split('-');
	return sra || '';
};

/**
 * Parses and validates sequencing metadata JSON string.
 *
 * @param metadata - The JSON string containing sequencing metadata.
 * @returns The parsed and validated sequencing metadata as `SequencingMetadataType`, or `null` if invalid.
 */
export const parseSequencingMetadata = (metadata: string) => {
	if (!metadata) {
		logger.error('Sequencing metadata is empty or undefined.');
		return null;
	}

	try {
		// Parse the JSON string
		const parsed = JSON.parse(metadata);

		// Validate the parsed data against the sequencingMetadataSchema
		const result = sequencingMetadataSchema.safeParse(parsed);

		if (result.success) {
			return result.data;
		}

		// Log validation errors if the schema validation fails
		logger.error(`Sequencing metadata validation failed: ${result.error}`);
		return null;
	} catch (error) {
		// Log parsing errors
		logger.error('Failed to parse sequencing metadata JSON', error);
		return null;
	}
};

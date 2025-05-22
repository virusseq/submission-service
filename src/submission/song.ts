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

import { env } from '@/common/envConfig.js';
import logger from '@/common/logger.js';

import fetchWithAuth from './fetchWithAuth.js';

/**
 * Response returned by Song on successful submission.
 */
type SubmitResponse = {
	analysisId: string;
	status: string;
};

const isSubmitSuccessResponse = (data: any): data is SubmitResponse =>
	typeof data === 'object' && data !== null && typeof data.analysisId === 'string' && typeof data.status === 'string';

/**
 * Submits a payload using a POST request with authentication.
 * @param organization - The organization to submit to
 * @param payload - The payload to submit
 * @returns The JSON response or throws on error with a message
 */
export const submit = async (organization: string, payload: any): Promise<SubmitResponse> => {
	const apiUrl = new URL(`/submit/${organization}`, env.SEQUENCING_SUBMISSION_URL).toString();
	logger.info(`Sequencing submission with payload: ${JSON.stringify(payload)}`);
	const response = await fetchWithAuth(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		let message = `Sequencing Submission failed with status '${response.status}'`;
		try {
			const errorBody = await response.json();
			const errorDetail = typeof errorBody?.message === 'string' ? errorBody.message : JSON.stringify(errorBody);
			message += `: ${errorDetail}`;
		} catch {
			message += `: Failed to parse error response`;
		}
		logger.error(message);
		throw new Error(message);
	}

	try {
		const data = await response.json();

		if (!isSubmitSuccessResponse(data)) {
			logger.error(`Unexpected response format: ${JSON.stringify(data)}`);
			throw new Error('Invalid response format');
		}

		return data;
	} catch {
		logger.error('Failed to parse successful response as JSON');
		throw new Error('Invalid JSON in sequencing submission response');
	}
};

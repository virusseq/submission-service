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

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Retrieves an access token using client credentials grant.
 */
async function getAccessToken(): Promise<string> {
	if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
		return cachedToken;
	}

	if (!env.SEQUENCING_SUBMISSION_CLIENT_ID || !env.SEQUENCING_SUBMISSION_CLIENT_SECRET) {
		throw new Error('CLIENT_ID or CLIENT_SECRET not set in environment variables.');
	}

	const response = await fetch(env.SEQUENCING_SUBMISSION_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: env.SEQUENCING_SUBMISSION_CLIENT_ID,
			client_secret: env.SEQUENCING_SUBMISSION_CLIENT_SECRET,
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${body}`);
	}

	const tokenData = await response.json();
	cachedToken = tokenData.access_token;
	tokenExpiry = Date.now() + tokenData.expires_in * 1000 - 5000; // Renew 5s before expiry

	if (!cachedToken) {
		throw new Error('Failed to retrieve access token');
	}

	return cachedToken;
}

/**
 * Makes an authenticated fetch request using bearer token.
 */
export default async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
	const token = await getAccessToken();

	const headers = {
		...(options.headers || {}),
		Authorization: `Bearer ${token}`,
	};

	return fetch(url, {
		...options,
		headers,
	});
}

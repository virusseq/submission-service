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

import type { UserSession } from '@overture-stack/lyric';

import { env } from './envConfig.js';

/**
 * Determines whether the authentication check should be bypassed based on configuration and request method.
 * @param requestMethod
 * @returns
 */
export const shouldBypassAuth = (requestMethod: string) => {
	if (!env.AUTH_ENABLED) {
		// bypass auth if it's globally disabled
		return true;
	}

	// Skip auth if configured protectedMethods is a valid array and does not include the request method
	const configuredProtectedMethods = env.AUTH_PROTECT_METHODS;
	if (
		Array.isArray(configuredProtectedMethods) &&
		!configuredProtectedMethods.some((method) => method === requestMethod)
	) {
		return true;
	}

	// Default: required auth
	return false;
};

/**
 * checks if a user has write access to a specific organization.
 * @param organization
 * @param user
 * @returns
 */
export const hasUserWriteAccess = (organization: string, user?: UserSession): boolean => {
	if (!user) {
		return false;
	}

	if (user.isAdmin) {
		// if user is admin should have access to write all organization
		return true;
	}

	return user.allowedWriteOrganizations.includes(organization);
};

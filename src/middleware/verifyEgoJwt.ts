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

import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { jwtDecode } from 'jwt-decode';

import type { UserSessionResult } from '@overture-stack/lyric';

import { env } from '@/common/envConfig.js';
import logger from '@/common/logger.js';

/**
 * Interface for the decoded JWT token payload
 */
interface EgoJwtData {
	context: {
		scope: string[];
		user: {
			email: string;
			status: string;
			type: string;
		};
	};
}

/**
 * Verifies and decodes the provided JWT token using the public key
 * @param token Raw JWT token
 * @returns
 */
const verifyJwtToken = (token: string): EgoJwtData | null => {
	try {
		jwt.verify(token, env.AUTH_PUBLIC_KEY.replace(/\\n/g, '\n'), { algorithms: ['RS256'] });
		return jwtDecode<EgoJwtData>(token);
	} catch {
		return null;
	}
};

/**
 * Checks if the decoded token's payload contains a valid user status.
 * @param decodedToken
 * @returns
 */
const isValidTokenPayload = (decodedToken: EgoJwtData): boolean => {
	return decodedToken.context?.user?.status === 'APPROVED';
};

/**
 * Extracts the JWT token from the `Authorization` header in the request.
 * The token must be prefixed with "Bearer ".
 * @param req
 * @returns
 */
const extractTokenFromHeader = (req: Request): string | undefined => {
	const authHeader = req.headers['authorization'];
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return;
	}

	return authHeader.split(' ')[1];
};

/**
 * Finds the organizations with write permissions from the provided list of scopes
 * @param scope
 * @returns
 */
const findWriteOrganizations = (scope: string[]): string[] => {
	const suffix = env.AUTH_PERMISSION_SUFFIX_WRITE_ORG?.trim();

	// Return empty array if suffix is empty or undefined
	if (!suffix) {
		return [];
	}

	return scope.filter((org) => org.endsWith(suffix));
};

/**
 * Checks if the given scope array includes the admin group
 * @param scope
 * @returns
 */
const hasAdminScope = (scope: string[]): boolean => {
	const admingroup = env.AUTH_PERMISSION_ADMIN.trim();

	// Return false if admin group is empty or undefined
	if (!admingroup) {
		return false;
	}

	return scope.some((value) => value === env.AUTH_PERMISSION_ADMIN);
};

/**
 * Function to verify the JWT token in the request header.
 * It checks if authentication is enabled, verifies the token is valid, and decodes the token.
 * If everything is valid, it returns the user information and status 'authenticated'.
 * Otherwise, it returns an 'invalid-auth' or 'invalid-auth' status
 * @param req
 * @returns
 */
export const verifyToken = (req: Request): UserSessionResult => {
	const token = extractTokenFromHeader(req);
	if (!token) {
		return {
			errorCode: 401,
			errorMessage: 'Unauthorized: No token provided',
		};
	}

	try {
		// Verify the token
		const decodedToken = verifyJwtToken(token);
		if (!decodedToken || !isValidTokenPayload(decodedToken)) {
			return {
				errorCode: 403,
				errorMessage: 'Forbidden: Invalid token',
			};
		}

		return {
			user: {
				username: decodedToken?.context?.user?.email || '',
				isAdmin: hasAdminScope(decodedToken?.context?.scope),
				allowedWriteOrganizations: findWriteOrganizations(decodedToken?.context?.scope || []),
			},
		};
	} catch (err) {
		logger.error(`Error verifying token ${err}`);
		return {
			errorCode: 403,
			errorMessage: 'Forbidden: Invalid token',
		};
	}
};

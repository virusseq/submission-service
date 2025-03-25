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
		user: {
			email: string;
			status: string;
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

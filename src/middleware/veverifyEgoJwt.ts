import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { jwtDecode } from 'jwt-decode';

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
	if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;

	return authHeader.split(' ')[1];
};

/**
 * Middleware function to verify the JWT token in the request header.
 * It checks if authentication is enabled, verifies the token is valid, and decodes the token.
 * If everything is valid, it attaches the user information to the `req.user` object.
 * Otherwise, it returns an appropriate HTTP error response.
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
	// proceed to the next middleware or route handler if auth is disabled
	if (!env.AUTH_ENABLED) return next();

	const token = extractTokenFromHeader(req);
	if (!token) {
		return res.status(401).json({ message: 'Unauthorized: No token provided' });
	}

	try {
		// Verify the token
		const decodedToken = verifyJwtToken(token);
		if (!decodedToken || !isValidTokenPayload(decodedToken)) {
			return res.status(400).json({ message: 'Invalid token payload' });
		}

		// Attach the user info to the request object
		req.user = {
			username: decodedToken?.context?.user?.email || '',
		};

		// Continue to the next middleware or route handler
		next();
	} catch (err) {
		logger.error(`Error verifying token ${err}`);
		return res.status(403).json({ message: 'Forbidden: Invalid token' });
	}
};

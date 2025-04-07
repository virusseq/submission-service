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

import type { NextFunction, Request, Response } from 'express';

import { type UserSession } from '@overture-stack/lyric';

import { env } from '@/common/envConfig.js';

import { verifyToken } from './verifyEgoJwt.js';

// Extends the Request interface to include a custom `user` object
declare module 'express-serve-static-core' {
	interface Request {
		user?: UserSession;
	}
}

/**
 * Middleware to handle authentication using JWT token if enabled
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
	if (!env.AUTH_ENABLED) {
		return next();
	}

	try {
		const authResult = verifyToken(req);

		if (authResult.errorCode) {
			return res.status(authResult.errorCode).json({ message: authResult.errorMessage });
		}

		req.user = authResult.user;
		return next();
	} catch (error) {
		console.error(`Error verifying token ${error}`);
		return res.status(403).json({ message: 'Forbidden: Invalid token' });
	}
};

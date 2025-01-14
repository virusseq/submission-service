import express from 'express';

import { UserSession } from '@overture-stack/lyric';

// Extends the Request interface to include a custom `user` object
declare global {
	namespace Express {
		interface Request {
			user?: UserSession;
		}
	}
}

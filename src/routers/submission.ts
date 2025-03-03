import express, { Router } from 'express';
import multer from 'multer';

import { env } from '@/common/envConfig.js';
import { submit } from '@/controllers/submission.js';
import { lyricProvider } from '@/core/provider.js';
import { getSizeInBytes } from '@/submission/fileValidation.js';

const fileSizeLimit = getSizeInBytes(env.SERVER_UPLOAD_LIMIT);
const upload = multer({ dest: '/tmp', limits: { fileSize: fileSizeLimit } });

export const submissionRouter: Router = (() => {
	const router = express.Router();

	router.post('/category/:categoryId/data', upload.array('files'), submit);

	router.use('', lyricProvider.routers.submission);

	return router;
})();

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

import express, { type Router } from 'express';
import multer from 'multer';

import { errorHandler } from '@overture-stack/lyric';

import { env } from '@/common/envConfig.js';
import { editData } from '@/controllers/submission/editData.js';
import { submit } from '@/controllers/submission/submit.js';
import { lyricProvider } from '@/core/provider.js';
import { authMiddleware } from '@/middleware/authMiddleware.js';
import { getSizeInBytes } from '@/submission/format.js';

const fileSizeLimit = getSizeInBytes(env.SERVER_UPLOAD_LIMIT);
const upload = multer({ dest: '/tmp', limits: { fileSize: fileSizeLimit } });

export const submissionRouter: Router = (() => {
	const router = express.Router();

	router.use(authMiddleware);

	router.post('/category/:categoryId/data', upload.array('files'), submit);
	router.put('/category/:categoryId/data', upload.array('files'), editData);

	router.use('', lyricProvider.routers.submission);
	router.use(errorHandler);

	return router;
})();

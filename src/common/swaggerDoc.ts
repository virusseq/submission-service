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

import swaggerJSDoc from 'swagger-jsdoc';

import { env } from '@/common/envConfig.js';

import { name, version } from './manifest.js';

const swaggerDefinition: swaggerJSDoc.OAS3Definition = {
	openapi: '3.0.1',
	info: {
		title: name,
		version,
	},
	...(env.AUTH_ENABLED
		? {
				security: [
					{
						bearerAuth: [],
					},
				],
			}
		: {}),
};

const options: swaggerJSDoc.OAS3Options = {
	swaggerDefinition,
	// Paths to files containing OpenAPI definitions
	apis: [
		'./src/routes/*.ts',
		'./src/api-docs/*.yml',
		...(env.AUTH_ENABLED ? ['./src/api-docs/security/bearer.yml'] : []),
	],
};

export default swaggerJSDoc(options);

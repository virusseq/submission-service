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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's URL
const __filename = fileURLToPath(import.meta.url);

// Get the directory name of the current file
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.join(__dirname, '../templates');

/**
 * Converts a record to a Song Payload using a template.
 * @param record - The record to convert
 * @param templateName - The name of the template file
 * @returns The converted payload
 */
export const convertRecordToPayload = (record: Record<string, string>, templateName: string): Record<string, any> => {
	const templatePath = path.join(TEMPLATE_DIR, templateName);
	let template = fs.readFileSync(templatePath, 'utf-8');

	template = template.replace(/{{(.*?)}}/g, (_, key) => {
		return record[key.trim()] ?? '';
	});

	try {
		return JSON.parse(template);
	} catch (err) {
		throw new Error(`Invalid JSON after template fill: ${err}`);
	}
};

/**
 * Adds a prefix to all keys in an object.
 * @param obj
 * @param prefix
 * @returns
 */
export const prefixKeys = (obj: Record<string, any>, prefix: string): Record<string, any> => {
	return Object.fromEntries(Object.entries(obj).map(([key, value]) => [`${prefix}${key}`, value]));
};

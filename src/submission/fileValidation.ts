import bytes from 'bytes';
import { BATCH_ERROR_TYPE, type BatchError, type Schema } from '@overture-stack/lyric';

import { readHeaders } from './readFile.js';
import { getSeparatorCharacter } from './format.js';

export const prevalidateUploadedFile = async (file: Express.Multer.File, schema: Schema): Promise<{ error?: BatchError; file: Express.Multer.File; }> => {
	// check if extension is supported
	const separatorCharacter = getSeparatorCharacter(file.originalname);
	if (!separatorCharacter) {
		return {
			error: {
				type: BATCH_ERROR_TYPE.INVALID_FILE_EXTENSION,
				message: `Invalid file extension ${file.originalname.split('.')[1]}`,
				batchName: file.originalname,
			},
			file
		};
	}

	const firstLine = await readHeaders(file);
	const fileHeaders = firstLine.split(separatorCharacter);

	const missingRequiredFields = schema
		.fields
		.filter(field => field.restrictions && 'required' in field.restrictions) // filter required fields
		.map(field => field.meta?.displayName?.toString() || field.name) // map displayName if exists
		.filter((fieldName) => !fileHeaders.includes(fieldName)) 
	if (missingRequiredFields.length > 0) {
		return { 
			error:{
				type: BATCH_ERROR_TYPE.MISSING_REQUIRED_HEADER,
				message: `Missing required fields '${JSON.stringify(missingRequiredFields)}'`,
				batchName: file.originalname,
			},
			file
		}
	}
	return { file };
}

export function getSizeInBytes(size: string | number): number {
	// Parse the string value into an integer in bytes.
	// If value is a number it is assumed is in bytes.
	return bytes.parse(size) || 0;
}

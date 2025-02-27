import { BATCH_ERROR_TYPE, getSchemaFieldNames, type BatchError, type Dictionary } from '@overture-stack/lyric';
import { readHeaders } from './readFile.js';

import { getSeparatorCharacter } from './format.js';

export const isEntityInDictionary = (currentDictionary: Dictionary, entityName: string | undefined): boolean => {
	const matchingEntityName = currentDictionary.schemas.find(
		(schema) => schema.name.toLowerCase() === entityName,
	);
	if (!matchingEntityName) {
		return false;
	}
	return true;
}

export const prevalidateUploadedFile = async (file: Express.Multer.File, currentDictionary: Dictionary): Promise<{ error?: BatchError; file: Express.Multer.File; }> => {
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

	// validate if entity name is present in the dictionary
	const entityName = file.originalname.split('.')[0]?.toLowerCase();
	const matchingEntityName = isEntityInDictionary(currentDictionary, entityName);
	if (!matchingEntityName || !entityName) {
		return {
			error: {
				type: BATCH_ERROR_TYPE.INVALID_FILE_NAME,
				message: `Invalid entity name for submission`,
				batchName: file.originalname,
			},
			file
		}
	}
	
	const schemaFieldNames = getSchemaFieldNames(currentDictionary, entityName);
	const firstLine = await readHeaders(file);
	const fileHeaders = firstLine.split(separatorCharacter);

	const missingRequiredFields = schemaFieldNames.required.filter(
		(requiredField) => !fileHeaders.includes(requiredField),
	);
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

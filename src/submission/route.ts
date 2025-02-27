import { Request, Response} from 'express';
import { CREATE_SUBMISSION_STATUS, type BatchError, type CreateSubmissionResult } from '@overture-stack/lyric';

import { lyricProvider } from '@/core/provider.js';
import { logger } from '@/common/logger.js';
import { parseFileToRecords } from './readFile.js';
import { prevalidateUploadedFile } from './fileValidation.js';

interface SubmitFileRequest extends Request {
    params: {
        categoryId: string;
    };
    files: Express.Multer.File[];
    body: {
        organization: string;
    };
}

export const submitFileRoute = async (req: SubmitFileRequest, res: Response) => {
    const categoryId = Number(req.params.categoryId);
    const files = Array.isArray(req.files) ? req.files : [];
    const organization = req.body.organization;

    // TODO: get userName from auth
    const userName = '';

    logger.info(
        `Upload Submission Request: categoryId '${categoryId}'`,
        ` organization '${organization}'`,
        ` files '${files?.map((f) => f.originalname)}'`,
    );

    if (!files || files.length == 0) {
        throw new lyricProvider.utils.errors.BadRequest(
            'The "files" parameter is missing or empty. Please include files in the request for processing.',
        );
    }

    // get the current dictionary
    const currentDictionary = await lyricProvider.services.dictionary.getActiveDictionaryByCategory(categoryId);

    if (!currentDictionary) {
        throw new lyricProvider.utils.errors.BadRequest(`Dictionary in category '${categoryId}' not found`);
    }

    const fileErrors: BatchError[] = [];
    const submissionResult: CreateSubmissionResult = {
        status: CREATE_SUBMISSION_STATUS.INVALID_SUBMISSION,
        description: '',
        batchErrors: [],
        inProcessEntities: [],
    };

    for(const file of files) {
        const { file: validFile, error } = await prevalidateUploadedFile(file, currentDictionary);
        if(error) {
            fileErrors.push(error);
            continue;
        }
        
        const extractedData = await parseFileToRecords(validFile);

        const entityName = validFile.originalname.split('.')[0]?.toLowerCase();
        const uploadResult = await lyricProvider.services.submission.uploadSubmission({
            records: extractedData,
            entityName,
            categoryId,
            organization,
            userName,
        });

        submissionResult.submissionId = uploadResult.submissionId;
        submissionResult.status = uploadResult.status;
        submissionResult.description = uploadResult.description;
        submissionResult.inProcessEntities.concat(uploadResult.inProcessEntities);
        submissionResult.batchErrors.concat(uploadResult.batchErrors);
    }

    if (fileErrors.length == 0 && submissionResult.batchErrors.length == 0) {
        logger.info(`Submission uploaded successfully`);
    } else {
        logger.info('Found some errors processing this request');
    }

    // This response provides the details of file Submission
    return res
    .status(200)
    .send({ ...submissionResult, batchErrors: submissionResult.batchErrors.concat(fileErrors) });
}

import { join as joinPath } from 'node:path/posix';
import { setTimeout } from 'node:timers/promises';

import type { ResultOnCommit, SubmittedDataResponse } from '@overture-stack/lyric';

import { logger } from '@/common/logger.js';

import { env } from '../common/envConfig.js';

const findCategoryMapping = (mappings: string | undefined, categoryId: string) => {
	return mappings
		?.split(',')
		.map((mapping) => mapping.split(':'))
		.find((pair) => pair[0] === categoryId);
};

const indexRecords = async (recordsToIndex: SubmittedDataResponse[], fullUrl: URL, path: string) => {
	for (const record of recordsToIndex) {
		fullUrl.pathname = joinPath(path, record.systemId);

		try {
			const response = await fetch(fullUrl, {
				method: 'POST',
			});
			if (!response.ok) {
				logger.error(`HTTP error! Status: ${response.status}`);
			}
			await setTimeout(500);
		} catch (error) {
			logger.error(`Error Indexing server ${fullUrl}`);
			logger.error(error);
		}
	}
};

export const onFinishCommitCallback = (resultOnCommit: ResultOnCommit) => {
	const { categoryId, organization, data } = resultOnCommit;

	// Return if indexer is disabled
	if (!env.INDEXER_ENABLED || !env.INDEXER_SERVER_URL) return;

	const mapping = findCategoryMapping(env.INDEXER_MAPPING, categoryId.toString());

	if (!mapping || !mapping[1]) {
		logger.info(`No index configuration exists for category ${categoryId}`);
		return;
	}

	const repoCode = mapping[1];
	const fullUrl = new URL(env.INDEXER_SERVER_URL);
	const path = joinPath('index/repository', repoCode, 'organization', organization, 'id');

	logger.info(
		`Records to index: inserts:${data?.inserts.length}, updates:${data?.updates.length}, deletes: ${data?.deletes.length}`,
	);

	const recordsToIndex = data?.inserts.concat(data?.updates).concat(data?.deletes);

	if (recordsToIndex?.length) {
		indexRecords(recordsToIndex, fullUrl, path);
	}
};

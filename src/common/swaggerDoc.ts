import swaggerJSDoc from 'swagger-jsdoc';

import { name, version } from './manifest.js';

const swaggerDefinition: swaggerJSDoc.OAS3Definition = {
	openapi: '3.0.1',
	info: {
		title: name,
		version,
	},
	security: [
		{
			bearerAuth: [],
		},
	],
};

const options: swaggerJSDoc.OAS3Options = {
	swaggerDefinition,
	// Paths to files containing OpenAPI definitions
	apis: ['./src/routes/*.ts', './src/api-docs/*.yml'],
};

export default swaggerJSDoc(options);

import { RequestHandler } from 'express-serve-static-core';
import { ZodError, ZodSchema } from 'zod';

export declare type RequestValidation<TBody, TQuery, TParams> = {
	body?: ZodSchema<TBody>;
	query?: ZodSchema<TQuery>;
	pathParams?: ZodSchema<TParams>;
};

/**
 * Validate the body using Zod parse
 * @param schema Zod objects used to validate request
 * @returns Throws a Bad Request when validation fails
 */
export function validateRequest<TBody, TQuery, TParams>(
	schema: RequestValidation<TBody, TQuery, TParams>,
	handler: RequestHandler<TParams, unknown, TBody, TQuery>,
): RequestHandler<TParams, unknown, TBody, TQuery> {
	const LOG_MODULE = 'REQUEST_VALIDATION';
	return async (req, res, next) => {
		try {
			if (schema.body) {
				schema.body.parse(req.body);
			}

			if (schema.query) {
				schema.query.parse(req.query);
			}

			if (schema.pathParams) {
				schema.pathParams.parse(req.params);
			}

			return handler(req, res, next);
		} catch (error) {
			if (error instanceof ZodError) {
				const errorMessages = error.errors.map((issue) => `${issue.path.join('.')} is ${issue.message}`).join(' | ');
				console.log(LOG_MODULE, req.method, req.url, JSON.stringify(errorMessages));
                res.status(400).send({ error: error.name, message: error.message, details: error.cause });
			} else {
				console.error(LOG_MODULE, req.method, req.url, 'Internal Server Error');
                res.status(500).send({ error: 'Internal Server Error', message: 'An unexpected error occurred' });
			}
		}
	};
}
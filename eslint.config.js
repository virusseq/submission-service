import js from '@eslint/js';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	// register all of the plugins up-front
	{
		plugins: {
			['@typescript-eslint']: tseslint.plugin,
			['simple-import-sort']: simpleImportSortPlugin,
			['prettier']: prettierPlugin,
		},
	},

	// config with just ignores is the replacement for `.eslintignore`
	{
		ignores: ['dist', 'package-lock.json', 'package.json'],
	},

	// extends ...
	js.configs.recommended,
	...tseslint.configs.recommended,

	// base config
	{
		// parser: "@typescript-eslint/parser",
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'prettier/prettier': 'error',
		},
		languageOptions: {
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
	},
);

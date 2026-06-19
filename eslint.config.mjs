import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importX from 'eslint-plugin-import-x';
import tsdoc from 'eslint-plugin-tsdoc';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

const TS_PROJECT = './tsconfig.eslint.json';

export default [
  {
    ignores: ['dist/', 'docs/', 'coverage/', 'eslint.config.mjs'],
  },

  js.configs.recommended,
  ...tseslint.configs['flat/recommended'],

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: TS_PROJECT,
      },
    },
    plugins: {
      'import-x': importX,
      tsdoc,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: TS_PROJECT })],
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
          args: 'none',
        },
      ],

      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',

      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      'tsdoc/syntax': 'error',

      'import-x/no-cycle': ['error', { ignoreExternal: true }],
    },
  },

  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^(_|start|end)$',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
          args: 'all',
        },
      ],
    },
  },

  {
    files: ['test/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  prettierRecommended,
];

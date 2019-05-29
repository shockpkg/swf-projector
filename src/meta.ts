// This file contains compile-time defined variables.
// Variables are wrapped in object to avoid source values in .d.ts files.

const vars = {
	VERSION: '@VERSION@',
	NAME: '@NAME@'
};

export const NAME = vars.NAME;

export const VERSION = vars.VERSION;

import {
	dirname as pathDirname,
	join as pathJoin
} from 'path';

import nodeRequireFunction from 'node-require-function';
// @ts-ignore
import rcedit from 'rcedit';

import {
	spawn
} from '../util';

const nodeRequire = nodeRequireFunction();

let locateSigntoolCache = '';
const isWindows =
	process.platform === 'win32' ||
	(process.platform as string) === 'win64';

/**
 * Get signtool binary location.
 *
 * @returns Path to signtool binary.
 * @deprecated No longer used in this package.
 */
function locateSigntool() {
	if (locateSigntoolCache) {
		return locateSigntoolCache;
	}

	if (!nodeRequire) {
		throw new Error('Failed to get node require function');
	}

	let path = nodeRequire.resolve('signtool');
	do {
		path = pathDirname(path);
	}
	while (path && !/[/\\]signtool$/i.test(path));

	let arch = 'x86';
	if (isWindows && process.arch === 'x64') {
		arch = 'x64';
	}

	return (locateSigntoolCache = pathJoin(
		path,
		'signtool',
		arch,
		'signtool.exe')
	);
}

/**
 * Versions strings passed to rcedit.
 *
 * @deprecated No longer used in this package.
 */
export interface IRceditOptionsVersionStrings {
	[key: string]: string;
}

/**
 * Options for rcedit.
 *
 * @deprecated No longer used in this package.
 */
export interface IRceditOptions {

	/**
	 * Icon path.
	 *
	 * @default null
	 */
	iconPath?: string | null;

	/**
	 * File version.
	 *
	 * @default null
	 */
	fileVersion?: string | null;

	/**
	 * Product version.
	 *
	 * @default null
	 */
	productVersion?: string | null;

	/**
	 * Version strings.
	 *
	 * @default null
	 */
	versionStrings?: IRceditOptionsVersionStrings | null;
}

/**
 * Uses rcedit to edit the resources of a Windows EXE.
 * Requires either Windows or wine in the path.
 *
 * @param path File path.
 * @param options Options object.
 * @deprecated No longer used in this package.
 */
export async function windowsRcedit(
	path: string,
	options: IRceditOptions
) {
	const opts: {[key: string]: any} = {};
	if (options.iconPath) {
		opts.icon = options.iconPath;
	}
	if (typeof options.fileVersion === 'string') {
		opts['file-version'] = options.fileVersion;
	}
	if (typeof options.productVersion === 'string') {
		opts['product-version'] = options.productVersion;
	}
	if (options.versionStrings) {
		opts['version-string'] = options.versionStrings;
	}
	await rcedit(path, opts);
}

/**
 * Uses signtool to remove the signature of a Windows EXE.
 * Requires either Windows or wine in the path.
 *
 * @param path File path.
 */
export async function windowsSigntoolUnsign(path: string) {
	const signtool = locateSigntool();
	const args = [
		'remove',
		'/s',
		path
	];
	const cl = isWindows ?
		[signtool, ...args] :
		['wine', signtool, ...args];

	const {done} = spawn(cl[0], cl.slice(1));
	await done;
}

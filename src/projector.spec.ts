import {
	join as pathJoin
} from 'path';

import fse from 'fs-extra';

import {
	getInstalledPackagesSync
} from './util.spec';

// eslint-disable-next-line no-process-env
export const envTest = process.env.SWF_PROJECTOR_TEST || null;

export const specProjectorsPath = pathJoin('spec', 'projectors');

export function shouldTest(name: string) {
	return !envTest || (
		envTest.toLowerCase().split(',')
			.includes(name.toLowerCase())
	);
}

export async function cleanProjectorDir(...path: string[]) {
	const dir = pathJoin(specProjectorsPath, ...path);
	await fse.remove(dir);
	await fse.ensureDir(dir);
	return dir;
}

export function versionZlib(version: number[]) {
	return version[0] >= 6;
}

export function versionLzma(version: number[]) {
	return version[0] > 11 || (version[0] === 11 && version[1] >= 1);
}

export function simpleSwf(zlib: boolean, lzma: boolean) {
	if (lzma) {
		return 'swf14-lzma.swf';
	}
	if (zlib) {
		return 'swf6-zlib.swf';
	}
	return 'swf3.swf';
}

export function packageInfo(name: string) {
	const m = name.match(/^flash-player-([\d.]+)-(.*)-sa(-debug)?$/);
	if (!m) {
		return null;
	}

	const version = m[1].split('.').map(Number);
	const zlib = versionZlib(version);
	const lzma = versionLzma(version);
	return {
		name,
		version,
		platform: m[2],
		debug: !!m[3],
		zlib,
		lzma
	};
}

export function getInstalledPackagesInfoSync() {
	const r = [];
	for (const name of getInstalledPackagesSync()) {
		const info = packageInfo(name);
		if (info) {
			r.push(info);
		}
	}

	r.sort((a, b) => (+a.debug) - (+b.debug));
	for (let i = 4; i--;) {
		r.sort((a, b) => (a.version[i] || 0) - (b.version[i] || 0));
	}

	return r;
}

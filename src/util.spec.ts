import {join as pathJoin} from 'node:path';
import {mkdir, rm} from 'node:fs/promises';
import {readdirSync, statSync} from 'node:fs';

import {Manager} from '@shockpkg/core';

// eslint-disable-next-line no-process-env
const envTest = process.env.SWF_PROJECTOR_TEST || null;

export function shouldTest(name: string) {
	return (
		!envTest ||
		envTest.toLowerCase().split(',').includes(name.toLowerCase())
	);
}

// eslint-disable-next-line no-process-env
export const testShowMenu = process.env.SWF_PROJECTOR_SHOWMENU === '1';

export const specFixturesPath = pathJoin('spec', 'fixtures');
export const specProjectorsPath = pathJoin('spec', 'projectors');
export const specBundlesPath = pathJoin('spec', 'bundles');

export function fixtureFile(name: string) {
	return pathJoin(specFixturesPath, name);
}

export async function getPackageFile(pkg: string) {
	return new Manager().file(pkg);
}

export async function cleanProjectorDir(...path: string[]) {
	const dir = pathJoin(specProjectorsPath, ...path);
	await rm(dir, {recursive: true, force: true});
	await mkdir(dir, {recursive: true});
	return dir;
}

export async function cleanBundlesDir(...path: string[]) {
	const dir = pathJoin(specBundlesPath, ...path);
	await rm(dir, {recursive: true, force: true});
	await mkdir(dir, {recursive: true});
	return dir;
}

let getInstalledPackagesCache: string[] | null = null;
export function getInstalledPackagesSync() {
	if (!getInstalledPackagesCache) {
		getInstalledPackagesCache = [];
		try {
			const dir = 'shockpkg';
			for (const d of readdirSync(dir, {withFileTypes: true})) {
				if (d.name.startsWith('.') || !d.isDirectory()) {
					continue;
				}
				const st = statSync(`${dir}/${d.name}/.shockpkg/package.json`);
				if (st.isFile()) {
					getInstalledPackagesCache.push(d.name);
				}
			}
		} catch (err) {
			if (!(err && (err as {code: string}).code === 'ENOENT')) {
				throw err;
			}
		}
	}
	return getInstalledPackagesCache;
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
	const m = name.match(/^flash-player-([\d.]+)-(.*)-sa(-debug)?(-.*)?$/);
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

	r.sort((a, b) => +a.debug - +b.debug);
	for (let i = 4; i--; ) {
		r.sort((a, b) => (a.version[i] || 0) - (b.version[i] || 0));
	}

	return r;
}

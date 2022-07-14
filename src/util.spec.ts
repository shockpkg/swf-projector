import {
	join as pathJoin
} from 'path';

import {
	Manager
} from '@shockpkg/core';

import {
	pathRelativeBase,
	trimExtension,
	once
} from './util';

export const platformIsMac = process.platform === 'darwin';

// eslint-disable-next-line no-process-env
const envTest = process.env.SWF_PROJECTOR_TEST || null;

export function shouldTest(name: string) {
	return !envTest || (
		envTest.toLowerCase().split(',')
			.includes(name.toLowerCase())
	);
}

export const specFixturesPath = pathJoin('spec', 'fixtures');

export function fixtureFile(name: string) {
	return pathJoin(specFixturesPath, name);
}

export async function getPackageFile(pkg: string) {
	return (new Manager()).with(
		async manager => manager.packageInstallFile(pkg)
	);
}

let getInstalledPackagesCache: string[] | null = null;
export function getInstalledPackagesSync() {
	if (!getInstalledPackagesCache) {
		// eslint-disable-next-line no-process-env
		const installed = process.env.SWF_PROJECTOR_INSTALLED || null;
		if (installed) {
			getInstalledPackagesCache = installed.split(',');
		}
		else {
			getInstalledPackagesCache = [];
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

describe('util', () => {
	describe('pathRelativeBase', () => {
		it('file', () => {
			expect(pathRelativeBase('test', 'test')).toBe('');
			expect(pathRelativeBase('test/', 'test')).toBe('');
			expect(pathRelativeBase('test', 'Test')).toBe(null);
		});

		it('file nocase', () => {
			expect(pathRelativeBase('test', 'Test', true)).toBe('');
		});

		it('dir', () => {
			expect(pathRelativeBase('test/123', 'test')).toBe('123');
			expect(pathRelativeBase('test/123', 'Test')).toBe(null);
		});

		it('dir nocase', () => {
			expect(pathRelativeBase('test/123', 'Test', true)).toBe('123');
		});
	});

	describe('trimExtension', () => {
		it('case', () => {
			expect(trimExtension('test.txt', '.txt')).toBe('test');
			expect(trimExtension('test.bin', '.txt')).toBe('test.bin');
			expect(trimExtension('test.TXT', '.txt')).toBe('test.TXT');
			expect(trimExtension('test.txt', '.TXT')).toBe('test.txt');
		});

		it('nocase', () => {
			expect(trimExtension('test.txt', '.TXT', true)).toBe('test');
			expect(trimExtension('test.TXT', '.txt', true)).toBe('test');
		});
	});

	describe('once', () => {
		it('called once', () => {
			let count = 0;
			const obj = {};
			const onced = once(() => {
				count++;
				return obj;
			});
			expect(count).toBe(0);
			expect(onced()).toBe(onced());
			expect(count).toBe(1);
		});
	});
});

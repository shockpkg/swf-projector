import {
	join as pathJoin
} from 'path';

import {
	Manager
} from '@shockpkg/core';
import execa from 'execa';

import {
	pathRelativeBase,
	trimExtension,
	once
} from './util';

export const platformIsMac = process.platform === 'darwin';

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
		const {stdout} = execa.sync('shockpkg', ['installed'], {
			preferLocal: true
		});
		getInstalledPackagesCache = stdout.trim().split(/[\r\n]+/);
	}
	return getInstalledPackagesCache;
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

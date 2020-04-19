import {
	join as pathJoin
} from 'path';

import {
	Manager
} from '@shockpkg/core';
import execa from 'execa';

import {
	infoPlistReplace,
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

const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
const xmlDoctype = '<!DOCTYPE plist PUBLIC "" "">';

const createPlist = (xml: string) => `${xmlHeader}\n${xmlDoctype}\n${xml}`;

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

	describe('infoPlistReplace', () => {
		it('value', () => {
			expect(infoPlistReplace(
				createPlist([
					'<plist version="1.0">',
					'<dict>',
					'<key>foo</key>',
					'<string>bar</string>',
					'</dict>',
					'</plist>'
				].join('\n')),
				'foo',
				'<string>baz</string>'
			)).toBe(createPlist([
				'<plist version="1.0">',
				'<dict>',
				'<key>foo</key>',
				'<string>baz</string>',
				'</dict>',
				'</plist>'
			].join('\n')));
		});

		it('type', () => {
			expect(infoPlistReplace(
				createPlist([
					'<plist version="1.0">',
					'<dict>',
					'<key>foo</key>',
					'<string>bar</string>',
					'</dict>',
					'</plist>'
				].join('\n')),
				'foo',
				'<true/>'
			)).toBe(createPlist([
				'<plist version="1.0">',
				'<dict>',
				'<key>foo</key>',
				'<true/>',
				'</dict>',
				'</plist>'
			].join('\n')));
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

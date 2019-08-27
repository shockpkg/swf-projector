import {
	join as pathJoin
} from 'path';

import {
	Manager
} from '@shockpkg/core';
import fse from 'fs-extra';

import {
	infoPlistReplace,
	pathRelativeBase,
	trimExtension
} from './util';

export const platformIsMac = process.platform === 'darwin';
export const platformIsWindows = (
	process.platform === 'win32' ||
	(process.platform as string) === 'win64'
);

// eslint-disable-next-line no-process-env
export const envFastTest = process.env.SWF_PROJECTOR_FAST_TEST || null;

export function shouldTest(name: string) {
	return !envFastTest || envFastTest === name;
}

export const specFixturesPath = pathJoin('spec', 'fixtures');
export const specProjectorsPath = pathJoin('spec', 'projectors');

export function fixtureFile(name: string) {
	return pathJoin(specFixturesPath, name);
}

export async function getPackageFile(pkg: string) {
	return (new Manager()).with(
		async manager => manager.packageInstallFile(pkg)
	);
}

export async function cleanProjectorDir(...path: string[]) {
	const dir = pathJoin(specProjectorsPath, ...path);
	await fse.remove(dir);
	await fse.ensureDir(dir);
	return dir;
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
});

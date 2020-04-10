import fse from 'fs-extra';

import {
	cleanProjectorDir,
	fixtureFile,
	getPackageFile,
	shouldTest,
	getInstalledPackagesSync
} from '../util.spec';

import {
	ProjectorWindows
} from './windows';

function listSamples() {
	const r: {
		name: string;
		version: number[];
		debug: boolean;
		zlib: boolean;
		lzma: boolean;
	}[] = [];
	if (!shouldTest('windows')) {
		return r;
	}

	for (const name of getInstalledPackagesSync()) {
		const m = name.match(
			/^flash-player-([\d.]+)-windows(-32bit)?-sa(-debug)?$/
		);
		if (!m) {
			continue;
		}

		const version = m[1].split('.').map(Number);
		const debug = !!m[3];
		const zlib = version[0] >= 6;
		const lzma = version[0] > 11 || (version[0] === 11 && version[1] >= 1);
		r.push({
			name,
			version,
			debug,
			zlib,
			lzma
		});
	}

	r.sort((a, b) => (+a.debug) - (+b.debug));
	for (let i = 4; i--;) {
		r.sort((a, b) => (a.version[i] || 0) - (b.version[i] || 0));
	}
	return r;
}

const fileVersion = '3.14.15.92';
const productVersion = '3.1.4.1';
const versionStrings = {
	CompanyName: 'Custom Company Name',
	FileDescription: 'Custom File Description',
	LegalCopyright: 'Custom Legal Copyright',
	ProductName: 'Custom Pruduct Name',
	LegalTrademarks: 'Custom Legal Trademarks',
	OriginalFilename: 'CustomOriginalFilename.exe',
	InternalName: 'CustomInternalName',
	Comments: 'Custom Comments'
};

const removeCodeSignature = true;

describe('projectors/windows', () => {
	describe('ProjectorWindows', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'windows', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				await (new ProjectorWindows({
					player: fixtureFile('dummy.exe'),
					movieFile: fixtureFile('swf3.swf'),
					removeCodeSignature: false
				})).write(dir, 'application.exe');
			});

			it('archived', async () => {
				const dir = await getDir('archived');
				await (new ProjectorWindows({
					player: fixtureFile('dummy.exe.zip'),
					movieFile: fixtureFile('swf3.swf'),
					removeCodeSignature: false
				})).write(dir, 'application.exe');
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'windows', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					await (new ProjectorWindows({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						removeCodeSignature
					})).write(dir, 'application.exe');
				});

				if (pkg.zlib) {
					it('zlib', async () => {
						const dir = await getDir('zlib');
						await (new ProjectorWindows({
							player: await getPlayer(),
							movieFile: fixtureFile('swf6-zlib.swf'),
							removeCodeSignature
						})).write(dir, 'application.exe');
					});
				}

				if (pkg.lzma) {
					it('lzma', async () => {
						const dir = await getDir('lzma');
						await (new ProjectorWindows({
							player: await getPlayer(),
							movieFile: fixtureFile('swf14-lzma.swf'),
							removeCodeSignature
						})).write(dir, 'application.exe');
					});
				}

				it('resedit', async () => {
					const dir = await getDir('resedit');
					await (new ProjectorWindows({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						iconFile: fixtureFile('icon.ico'),
						fileVersion,
						productVersion,
						versionStrings,
						removeCodeSignature
					})).write(dir, 'application.exe');
				});

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					await (new ProjectorWindows({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-loadmovie.swf')
					})).write(dir, 'application');
					await fse.copy(
						fixtureFile('image.jpg'),
						`${dir}/image.jpg`
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					await (new ProjectorWindows({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-showmenu-false.swf')
					})).write(dir, 'application');
				});
			});
		}
	});
});

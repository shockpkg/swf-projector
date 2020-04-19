import fse from 'fs-extra';

import {
	cleanProjectorDir,
	shouldTest,
	getInstalledPackagesInfoSync,
	simpleSwf
} from '../projector.spec';
import {
	fixtureFile,
	getPackageFile
} from '../util.spec';

import {
	ProjectorWindows
} from './windows';

function listSamples() {
	if (!shouldTest('windows')) {
		return [];
	}
	return getInstalledPackagesInfoSync()
		.filter(o => o.platform.startsWith('windows'));
}

const versionStrings = {
	FileVersion: '3.14.15.92',
	ProductVersion: '3.1.4.1',
	CompanyName: 'Custom Company Name',
	FileDescription: 'Custom File Description',
	LegalCopyright: 'Custom Legal Copyright',
	ProductName: 'Custom Product Name',
	LegalTrademarks: 'Custom Legal Trademarks',
	OriginalFilename: 'CustomOriginalFilename.exe',
	InternalName: 'CustomInternalName',
	Comments: 'Custom Comments'
};

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
				cleanProjectorDir('windows', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					await (new ProjectorWindows({
						player: await getPlayer(),
						movieFile: simple,
						removeCodeSignature: true
					})).write(dir, 'application.exe');
				});

				it('resedit', async () => {
					const dir = await getDir('resedit');
					await (new ProjectorWindows({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						iconFile: fixtureFile('icon.ico'),
						versionStrings,
						removeCodeSignature: true
					})).write(dir, 'application.exe');
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					await (new ProjectorWindows({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-loadmovie.swf')
					})).write(dir, 'application.exe');
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
					})).write(dir, 'application.exe');
				});
			});
		}
	});
});

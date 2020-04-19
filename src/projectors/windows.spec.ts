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
				cleanProjectorDir('windows', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				const p = new ProjectorWindows();
				p.player = fixtureFile('dummy.exe');
				p.movieFile = fixtureFile('swf3.swf');
				p.removeCodeSignature = false;
				await p.write(dir, 'application.exe');
			});

			it('archived', async () => {
				const dir = await getDir('archived');
				const p = new ProjectorWindows();
				p.player = fixtureFile('dummy.exe.zip');
				p.movieFile = fixtureFile('swf3.swf');
				p.removeCodeSignature = false;
				await p.write(dir, 'application.exe');
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
					const p = new ProjectorWindows();
					p.player = await getPlayer();
					p.movieFile = simple;
					p.removeCodeSignature = true;
					await p.write(dir, 'application.exe');
				});

				it('resedit', async () => {
					const dir = await getDir('resedit');
					const p = new ProjectorWindows();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf3.swf');
					p.iconFile = fixtureFile('icon.ico');
					p.versionStrings = versionStrings;
					p.removeCodeSignature = true;
					await p.write(dir, 'application.exe');
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					const p = new ProjectorWindows();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-loadmovie.swf');
					await p.write(dir, 'application.exe');
					await fse.copy(
						fixtureFile('image.jpg'),
						`${dir}/image.jpg`
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					const p = new ProjectorWindows();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-showmenu-false.swf');
					await p.write(dir, 'application.exe');
				});
			});
		}
	});
});

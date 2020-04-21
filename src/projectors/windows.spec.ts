import {
	join as pathJoin
} from 'path';

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
				const dest = pathJoin(dir, 'application.exe');

				const p = new ProjectorWindows(dest);
				p.removeCodeSignature = false;
				await p.with(
					fixtureFile('dummy.exe'),
					fixtureFile('swf3.swf')
				);
			});

			it('archived', async () => {
				const dir = await getDir('archived');
				const dest = pathJoin(dir, 'application.exe');

				const p = new ProjectorWindows(dest);
				p.removeCodeSignature = false;
				await p.with(
					fixtureFile('dummy.exe.zip'),
					fixtureFile('swf3.swf')
				);
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
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows(dest);
					p.removeCodeSignature = true;
					await p.with(
						await getPlayer(),
						simple
					);
				});

				it('resedit', async () => {
					const dir = await getDir('resedit');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows(dest);
					p.iconFile = fixtureFile('icon.ico');
					p.versionStrings = versionStrings;
					p.removeCodeSignature = true;
					await p.with(
						await getPlayer(),
						fixtureFile('swf3.swf')
					);
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows(dest);
					await p.with(
						await getPlayer(),
						fixtureFile('swf6-loadmovie.swf')
					);

					await fse.copy(
						fixtureFile('image.jpg'),
						pathJoin(dir, 'image.jpg')
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows(dest);
					await p.with(
						await getPlayer(),
						fixtureFile('swf6-showmenu-false.swf')
					);
				});
			});
		}
	});
});

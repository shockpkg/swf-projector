import {copyFile} from 'fs/promises';
import {join as pathJoin} from 'path';

import {cleanProjectorDir} from '../../projector.spec';
import {
	fixtureFile,
	getPackageFile,
	shouldTest,
	getInstalledPackagesInfoSync,
	simpleSwf
} from '../../util.spec';
import {ProjectorWindows} from '../windows';

import {ProjectorWindows64} from './64';

export function listSamples() {
	if (!shouldTest('windows64')) {
		return [];
	}
	return getInstalledPackagesInfoSync()
		.filter(o => o.platform === 'windows-x86_64')
		.map(o => ({...o, patchOutOfDateDisable: o.version[0] >= 30}));
}

export const versionStrings = {
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

describe('projector/windows/64', () => {
	describe('ProjectorWindows64', () => {
		it('instanceof ProjectorWindows', () => {
			expect(
				ProjectorWindows64.prototype instanceof ProjectorWindows
			).toBeTrue();
		});

		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('windows64', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application.exe');

				const p = new ProjectorWindows64(dest);
				await p.withFile(
					fixtureFile('dummy.exe'),
					fixtureFile('swf3.swf')
				);
			});

			it('archived', async () => {
				const dir = await getDir('archived');
				const dest = pathJoin(dir, 'application.exe');

				const p = new ProjectorWindows64(dest);
				await p.withFile(
					fixtureFile('dummy.exe.zip'),
					fixtureFile('swf3.swf')
				);
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('windows64', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows64(dest);
					p.removeCodeSignature = true;
					p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;
					await p.withFile(await getPlayer(), simple);
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows64(dest);
					p.iconFile = fixtureFile('icon.ico');
					p.versionStrings = versionStrings;
					p.removeCodeSignature = true;
					p.patchWindowTitle = 'Custom Title';
					p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;
					await p.withFile(
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

					const p = new ProjectorWindows64(dest);
					p.removeCodeSignature = true;
					p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;
					await p.withFile(
						await getPlayer(),
						fixtureFile('swf6-loadmovie.swf')
					);

					await copyFile(
						fixtureFile('image.jpg'),
						pathJoin(dir, 'image.jpg')
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows64(dest);
					p.removeCodeSignature = true;
					p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;
					await p.withFile(
						await getPlayer(),
						fixtureFile('swf6-showmenu-false.swf')
					);
				});
			});
		}
	});
});
import {copyFile} from 'fs/promises';
import {join as pathJoin} from 'path';

import {cleanProjectorDir} from '../projector.spec';
import {
	fixtureFile,
	getPackageFile,
	shouldTest,
	getInstalledPackagesInfoSync,
	simpleSwf,
	testShowMenu
} from '../util.spec';
import {Projector} from '../projector';

import {ProjectorWindows} from './windows';

export function listSamples() {
	const platforms = new Set();
	if (shouldTest('windows-i386')) {
		platforms.add('windows');
		platforms.add('windows-32bit');
		platforms.add('windows-i386');
	}
	if (shouldTest('windows-x86_64')) {
		platforms.add('windows-x86_64');
	}
	return getInstalledPackagesInfoSync()
		.filter(o => platforms.has(o.platform))
		.map(o => ({
			...o,
			type: o.platform === 'windows-x86_64' ? 'x86_64' : 'i386',
			patchOutOfDateDisable: o.version[0] >= 30
		}));
}

export const customWindowTitle =
	'Custom Window Title (Longer Than The Original Window Title Was)';

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

describe('projector/windows', () => {
	describe('ProjectorWindows', () => {
		it('instanceof Projector', () => {
			expect(ProjectorWindows.prototype instanceof Projector).toBeTrue();
		});

		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('windows', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application.exe');

				const p = new ProjectorWindows(dest);
				await p.withFile(
					fixtureFile('dummy.exe'),
					fixtureFile('swf3.swf')
				);
			});

			it('archived', async () => {
				const dir = await getDir('archived');
				const dest = pathJoin(dir, 'application.exe');

				const p = new ProjectorWindows(dest);
				await p.withFile(
					fixtureFile('dummy.exe.zip'),
					fixtureFile('swf3.swf')
				);
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('windows', pkg.type, pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows(dest);
					p.removeCodeSignature = true;
					p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;
					await p.withFile(await getPlayer(), simple);
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows(dest);
					p.iconFile = fixtureFile('icon.ico');
					p.versionStrings = versionStrings;
					p.removeCodeSignature = true;
					p.patchWindowTitle = customWindowTitle;
					p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;

					if (pkg.version[0] < 6) {
						await p.withFile(
							await getPlayer(),
							fixtureFile('swf3.swf')
						);
					} else {
						await p.withFile(
							await getPlayer(),
							fixtureFile('swf6-loadmovie.swf')
						);
						await copyFile(
							fixtureFile('image.jpg'),
							pathJoin(dir, 'image.jpg')
						);
					}
				});

				if (pkg.version[0] >= 6 && testShowMenu) {
					it('showmenu-false', async () => {
						const dir = await getDir('showmenu-false');
						const dest = pathJoin(dir, 'application.exe');

						const p = new ProjectorWindows(dest);
						p.removeCodeSignature = true;
						p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;
						await p.withFile(
							await getPlayer(),
							fixtureFile('swf6-showmenu-false.swf')
						);
					});
				}
			});
		}
	});
});

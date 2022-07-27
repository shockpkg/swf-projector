import {copyFile} from 'fs/promises';
import {join as pathJoin} from 'path';

import {cleanProjectorDir} from '../../projector.spec';
import {
	fixtureFile,
	getPackageFile,
	platformIsMac,
	shouldTest,
	getInstalledPackagesInfoSync,
	simpleSwf
} from '../../util.spec';
import {ProjectorMac} from '../mac';

import {ProjectorMacApp} from './app';

export function listSamples() {
	if (!(platformIsMac && shouldTest('macapp'))) {
		return [];
	}
	const fixBrokenIconPathsSet = new Set([
		'flash-player-9.0.28.0-mac-sa-debug',
		'flash-player-9.0.45.0-mac-sa-debug'
	]);
	return getInstalledPackagesInfoSync()
		.filter(o => o.platform === 'mac')
		.map(o => ({
			...o,
			fixBrokenIconPaths: fixBrokenIconPathsSet.has(o.name)
		}));
}

describe('projector/mac/app', () => {
	describe('ProjectorMacApp', () => {
		it('instanceof ProjectorMac', () => {
			expect(
				ProjectorMacApp.prototype instanceof ProjectorMac
			).toBeTrue();
		});

		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('macapp', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application.app');

				const p = new ProjectorMacApp(dest);
				p.removeCodeSignature = false;
				await p.withFile(
					fixtureFile('dummy.app'),
					fixtureFile('swf3.swf')
				);
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('macapp', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.removeCodeSignature = true;
					await p.withFile(await getPlayer(), simple);
				});

				if (pkg.fixBrokenIconPaths) {
					it('fixBrokenIconPaths', async () => {
						const dir = await getDir('fixBrokenIconPaths');
						const dest = pathJoin(dir, 'application.app');

						const p = new ProjectorMacApp(dest);
						p.fixBrokenIconPaths = true;
						p.removeCodeSignature = true;
						await p.withFile(
							await getPlayer(),
							fixtureFile('swf3.swf')
						);
					});
				}

				it('removeFileAssociations', async () => {
					const dir = await getDir('removeFileAssociations');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.removeFileAssociations = true;
					p.removeCodeSignature = true;
					await p.withFile(
						await getPlayer(),
						fixtureFile('swf3.swf')
					);
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.iconFile = fixtureFile('icon.icns');
					p.infoPlistFile = fixtureFile('Info.plist');
					p.pkgInfoFile = fixtureFile('PkgInfo');
					p.binaryName = 'application';
					p.bundleName = 'App Bundle Name';
					p.removeInfoPlistStrings = true;
					p.removeCodeSignature = true;
					await p.withFile(
						await getPlayer(),
						fixtureFile('swf3.swf')
					);
				});

				if (pkg.version[0] >= 11) {
					it('title', async () => {
						const dir = await getDir('title');
						const dest = pathJoin(dir, 'application.app');

						const p = new ProjectorMacApp(dest);
						p.patchWindowTitle = 'Custom Title';
						p.removeCodeSignature = true;
						await p.withFile(
							await getPlayer(),
							fixtureFile('swf3.swf')
						);
					});
				}

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
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
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					await p.withFile(
						await getPlayer(),
						fixtureFile('swf6-showmenu-false.swf')
					);
				});
			});
		}
	});
});

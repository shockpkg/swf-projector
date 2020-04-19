import fse from 'fs-extra';

import {
	cleanProjectorDir,
	shouldTest,
	getInstalledPackagesInfoSync,
	simpleSwf
} from '../projector.spec';
import {
	fixtureFile,
	getPackageFile,
	platformIsMac
} from '../util.spec';

import {
	ProjectorMacApp
} from './macapp';

function listSamples() {
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

describe('projectors/macapp', () => {
	describe('ProjectorMacApp', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('macapp', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				await (new ProjectorMacApp({
					player: fixtureFile('dummy.app'),
					movieFile: fixtureFile('swf3.swf'),
					removeCodeSignature: false
				})).write(dir, 'application.app');
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('macapp', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: simple,
						removeCodeSignature: true
					})).write(dir, 'application.app');
				});

				if (pkg.fixBrokenIconPaths) {
					it('fixBrokenIconPaths', async () => {
						const dir = await getDir('fixBrokenIconPaths');
						await (new ProjectorMacApp({
							player: await getPlayer(),
							movieFile: fixtureFile('swf3.swf'),
							fixBrokenIconPaths: true,
							removeCodeSignature: true
						})).write(dir, 'application.app');
					});
				}

				it('removeFileAssociations', async () => {
					const dir = await getDir('removeFileAssociations');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						removeFileAssociations: true,
						removeCodeSignature: true
					})).write(dir, 'application.app');
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						iconFile: fixtureFile('icon.icns'),
						infoPlistFile: fixtureFile('Info.plist'),
						pkgInfoFile: fixtureFile('PkgInfo'),
						binaryName: 'application',
						removeCodeSignature: true
					})).write(dir, 'application.app');
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-loadmovie.swf')
					})).write(dir, 'application.app');
					await fse.copy(
						fixtureFile('image.jpg'),
						`${dir}/image.jpg`
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-showmenu-false.swf')
					})).write(dir, 'application.app');
				});
			});
		}
	});
});

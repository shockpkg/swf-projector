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
				const dest = pathJoin(dir, 'application.app');

				const p = new ProjectorMacApp(dest);
				p.player = fixtureFile('dummy.app');
				p.movieFile = fixtureFile('swf3.swf');
				p.removeCodeSignature = false;
				await p.write();
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
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.player = await getPlayer();
					p.movieFile = simple;
					p.removeCodeSignature = true;
					await p.write();
				});

				if (pkg.fixBrokenIconPaths) {
					it('fixBrokenIconPaths', async () => {
						const dir = await getDir('fixBrokenIconPaths');
						const dest = pathJoin(dir, 'application.app');

						const p = new ProjectorMacApp(dest);
						p.player = await getPlayer();
						p.movieFile = fixtureFile('swf3.swf');
						p.fixBrokenIconPaths = true;
						p.removeCodeSignature = true;
						await p.write();
					});
				}

				it('removeFileAssociations', async () => {
					const dir = await getDir('removeFileAssociations');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf3.swf');
					p.removeFileAssociations = true;
					p.removeCodeSignature = true;
					await p.write();
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf3.swf');
					p.iconFile = fixtureFile('icon.icns');
					p.infoPlistFile = fixtureFile('Info.plist');
					p.pkgInfoFile = fixtureFile('PkgInfo');
					p.binaryName = 'application';
					p.removeCodeSignature = true;
					await p.write();
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-loadmovie.swf');
					await p.write();

					await fse.copy(
						fixtureFile('image.jpg'),
						pathJoin(dir, 'image.jpg')
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-showmenu-false.swf');
					await p.write();
				});
			});
		}
	});
});

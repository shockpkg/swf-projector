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
				const p = new ProjectorMacApp();
				p.player = fixtureFile('dummy.app');
				p.movieFile = fixtureFile('swf3.swf');
				p.removeCodeSignature = false;
				await p.write(dir, 'application.app');
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
					const p = new ProjectorMacApp();
					p.player = await getPlayer();
					p.movieFile = simple;
					p.removeCodeSignature = true;
					await p.write(dir, 'application.app');
				});

				if (pkg.fixBrokenIconPaths) {
					it('fixBrokenIconPaths', async () => {
						const dir = await getDir('fixBrokenIconPaths');
						const p = new ProjectorMacApp();
						p.player = await getPlayer();
						p.movieFile = fixtureFile('swf3.swf');
						p.fixBrokenIconPaths = true;
						p.removeCodeSignature = true;
						await p.write(dir, 'application.app');
					});
				}

				it('removeFileAssociations', async () => {
					const dir = await getDir('removeFileAssociations');
					const p = new ProjectorMacApp();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf3.swf');
					p.removeFileAssociations = true;
					p.removeCodeSignature = true;
					await p.write(dir, 'application.app');
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					const p = new ProjectorMacApp();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf3.swf');
					p.iconFile = fixtureFile('icon.icns');
					p.infoPlistFile = fixtureFile('Info.plist');
					p.pkgInfoFile = fixtureFile('PkgInfo');
					p.binaryName = 'application';
					p.removeCodeSignature = true;
					await p.write(dir, 'application.app');
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					const p = new ProjectorMacApp();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-loadmovie.swf');
					await p.write(dir, 'application.app');
					await fse.copy(
						fixtureFile('image.jpg'),
						`${dir}/image.jpg`
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					const p = new ProjectorMacApp();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-showmenu-false.swf');
					await p.write(dir, 'application.app');
				});
			});
		}
	});
});

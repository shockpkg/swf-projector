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
	ProjectorLinux
} from './linux';

function listSamples() {
	if (!shouldTest('linux')) {
		return [];
	}
	return getInstalledPackagesInfoSync()
		.filter(o => o.platform === 'linux' || o.platform === 'linux-i386')
		.map(o => ({
			...o,

			// Surprisingly it appears version 6 resolved path correctly.
			patchProjectorPath: o.version[0] > 6
		}));
}

describe('projectors/linux', () => {
	describe('ProjectorLinux', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('linux', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				const p = new ProjectorLinux();
				p.player = fixtureFile('dummy');
				p.movieFile = fixtureFile('swf3.swf');
				await p.write(dir, 'application');
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('linux', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const p = new ProjectorLinux();
					p.player = await getPlayer();
					p.movieFile = simple;
					await p.write(dir, 'application');
				});

				it('title', async () => {
					const dir = await getDir('title');
					const p = new ProjectorLinux();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf3.swf');
					p.patchWindowTitle = 'Custom Title';
					await p.write(dir, 'application');
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					const p = new ProjectorLinux();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-loadmovie.swf');
					p.patchProjectorPath = pkg.patchProjectorPath;
					await p.write(dir, 'application');
					await fse.copy(
						fixtureFile('image.jpg'),
						`${dir}/image.jpg`
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					const p = new ProjectorLinux();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-showmenu-false.swf');
					await p.write(dir, 'application');
				});

				it('nomenu', async () => {
					const dir = await getDir('nomenu');
					const p = new ProjectorLinux();
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-loadmovie.swf');
					p.patchProjectorPath = pkg.patchProjectorPath;
					p.patchMenuRemove = true;
					await p.write(dir, 'application');
					await fse.copy(
						fixtureFile('image.jpg'),
						`${dir}/image.jpg`
					);
				});
			});
		}
	});
});

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
	ProjectorLinux64
} from './linux64';

function listSamples() {
	if (!shouldTest('linux64')) {
		return [];
	}
	return getInstalledPackagesInfoSync()
		.filter(o => o.platform === 'linux-x86_64');
}

describe('projectors/linux64', () => {
	describe('ProjectorLinux64', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('linux64', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application');

				const p = new ProjectorLinux64(dest);
				p.player = fixtureFile('dummy');
				p.movieFile = fixtureFile('swf3.swf');
				await p.write();
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('linux64', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux64(dest);
					p.player = await getPlayer();
					p.movieFile = simple;
					p.patchProjectorOffset = true;
					await p.write();
				});

				it('title', async () => {
					const dir = await getDir('title');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux64(dest);
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf3.swf');
					p.patchProjectorOffset = true;
					p.patchWindowTitle = 'Custom Title';
					await p.write();
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux64(dest);
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-loadmovie.swf');
					p.patchProjectorPath = true;
					p.patchProjectorOffset = true;
					await p.write();

					await fse.copy(
						fixtureFile('image.jpg'),
						pathJoin(dir, 'image.jpg')
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					const dest = pathJoin(dir, 'application');
					const p = new ProjectorLinux64(dest);
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-showmenu-false.swf');
					p.patchProjectorOffset = true;
					await p.write();
				});

				it('nomenu', async () => {
					const dir = await getDir('nomenu');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux64(dest);
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf6-loadmovie.swf');
					p.patchProjectorPath = true;
					p.patchProjectorOffset = true;
					p.patchMenuRemove = true;
					await p.write();

					await fse.copy(
						fixtureFile('image.jpg'),
						pathJoin(dir, 'image.jpg')
					);
				});
			});
		}
	});
});

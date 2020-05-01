import {
	join as pathJoin
} from 'path';

import fse from 'fs-extra';

import {
	cleanProjectorDir
} from '../../projector.spec';
import {
	fixtureFile,
	getPackageFile,
	shouldTest,
	getInstalledPackagesInfoSync,
	simpleSwf
} from '../../util.spec';

import {
	ProjectorLinux64
} from './64';

function listSamples() {
	if (!shouldTest('linux64')) {
		return [];
	}
	return getInstalledPackagesInfoSync()
		.filter(o => o.platform === 'linux-x86_64');
}

describe('projector/linux/64', () => {
	describe('ProjectorLinux64', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('linux64', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application');

				const p = new ProjectorLinux64(dest);
				await p.withFile(
					fixtureFile('dummy'),
					fixtureFile('swf3.swf')
				);
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
					p.patchProjectorOffset = true;
					await p.withFile(
						await getPlayer(),
						simple
					);
				});

				it('title', async () => {
					const dir = await getDir('title');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux64(dest);
					p.patchProjectorOffset = true;
					p.patchWindowTitle = 'Custom Title';
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
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux64(dest);
					p.patchProjectorPath = true;
					p.patchProjectorOffset = true;
					await p.withFile(
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
					const dest = pathJoin(dir, 'application');
					const p = new ProjectorLinux64(dest);
					p.patchProjectorOffset = true;
					await p.withFile(
						await getPlayer(),
						fixtureFile('swf6-showmenu-false.swf')
					);
				});

				it('nomenu', async () => {
					const dir = await getDir('nomenu');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux64(dest);
					p.patchProjectorPath = true;
					p.patchProjectorOffset = true;
					p.patchMenuRemove = true;
					await p.withFile(
						await getPlayer(),
						fixtureFile('swf6-loadmovie.swf')
					);

					await fse.copy(
						fixtureFile('image.jpg'),
						pathJoin(dir, 'image.jpg')
					);
				});
			});
		}
	});
});

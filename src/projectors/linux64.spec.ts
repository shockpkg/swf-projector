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
				await (new ProjectorLinux64({
					player: fixtureFile('dummy'),
					movieFile: fixtureFile('swf3.swf')
				})).write(dir, 'application');
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
					await (new ProjectorLinux64({
						player: await getPlayer(),
						movieFile: simple,
						patchProjectorOffset: true
					})).write(dir, 'application');
				});

				it('title', async () => {
					const dir = await getDir('title');
					await (new ProjectorLinux64({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						patchProjectorOffset: true,
						patchWindowTitle: 'Custom Title'
					})).write(dir, 'application');
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					await (new ProjectorLinux64({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-loadmovie.swf'),
						patchProjectorPath: true,
						patchProjectorOffset: true
					})).write(dir, 'application');
					await fse.copy(
						fixtureFile('image.jpg'),
						`${dir}/image.jpg`
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					await (new ProjectorLinux64({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-showmenu-false.swf'),
						patchProjectorOffset: true
					})).write(dir, 'application');
				});

				it('nomenu', async () => {
					const dir = await getDir('nomenu');
					await (new ProjectorLinux64({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-loadmovie.swf'),
						patchProjectorPath: true,
						patchProjectorOffset: true,
						patchMenuRemove: true
					})).write(dir, 'application');
					await fse.copy(
						fixtureFile('image.jpg'),
						`${dir}/image.jpg`
					);
				});
			});
		}
	});
});

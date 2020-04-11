import fse from 'fs-extra';

import {
	cleanProjectorDir,
	fixtureFile,
	getPackageFile,
	shouldTest,
	getInstalledPackagesSync
} from '../util.spec';

import {
	ProjectorLinux64
} from './linux64';

function listSamples() {
	const r: {
		name: string;
		version: number[];
		debug: boolean;
	}[] = [];
	if (!shouldTest('linux64')) {
		return r;
	}

	for (const name of getInstalledPackagesSync()) {
		const m = name.match(
			/^flash-player-([\d.]+)-linux-x86_64-sa(-debug)?$/
		);
		if (!m) {
			continue;
		}

		const version = m[1].split('.').map(Number);
		const debug = !!m[2];
		r.push({
			name,
			version,
			debug
		});
	}

	r.sort((a, b) => (+a.debug) - (+b.debug));
	for (let i = 4; i--;) {
		r.sort((a, b) => (a.version[i] || 0) - (b.version[i] || 0));
	}
	return r;
}

describe('projectors/linux64', () => {
	describe('ProjectorLinux64', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'linux64', 'dummy', d);

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
				cleanProjectorDir('projectors', 'linux64', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					await (new ProjectorLinux64({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						patchProjectorOffset: true
					})).write(dir, 'application');
				});

				it('zlib', async () => {
					const dir = await getDir('zlib');
					await (new ProjectorLinux64({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-zlib.swf'),
						patchProjectorOffset: true
					})).write(dir, 'application');
				});

				it('lzma', async () => {
					const dir = await getDir('lzma');
					await (new ProjectorLinux64({
						player: await getPlayer(),
						movieFile: fixtureFile('swf14-lzma.swf'),
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

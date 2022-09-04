import {copyFile} from 'fs/promises';
import {join as pathJoin} from 'path';

import {cleanProjectorDir} from '../../projector.spec';
import {
	fixtureFile,
	getPackageFile,
	shouldTest,
	getInstalledPackagesInfoSync,
	simpleSwf,
	testShowMenu
} from '../../util.spec';
import {ProjectorLinux} from '../linux';

import {ProjectorLinux64} from './64';

export function listSamples() {
	if (!shouldTest('linux64')) {
		return [];
	}
	return getInstalledPackagesInfoSync().filter(
		o => o.platform === 'linux-x86_64'
	);
}

export const customWindowTitle =
	'Custom Window Title (Longer Than The Original Window Title Was)';

describe('projector/linux/64', () => {
	describe('ProjectorLinux64', () => {
		it('instanceof ProjectorLinux', () => {
			expect(
				ProjectorLinux64.prototype instanceof ProjectorLinux
			).toBeTrue();
		});

		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('linux64', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application');

				const p = new ProjectorLinux64(dest);
				await p.withFile(fixtureFile('dummy'), fixtureFile('swf3.swf'));
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('linux64', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux64(dest);
					p.patchProjectorOffset = true;
					await p.withFile(await getPlayer(), simple);
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux64(dest);
					p.patchProjectorOffset = true;
					p.patchProjectorPath = true;
					p.patchWindowTitle = customWindowTitle;
					p.patchMenuRemove = true;

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
						const dest = pathJoin(dir, 'application');

						const p = new ProjectorLinux64(dest);
						p.patchProjectorOffset = true;
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

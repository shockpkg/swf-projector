import {copyFile} from 'fs/promises';
import {join as pathJoin} from 'path';

import {cleanProjectorDir} from '../projector.spec';
import {
	fixtureFile,
	getPackageFile,
	shouldTest,
	getInstalledPackagesInfoSync,
	simpleSwf,
	testShowMenu
} from '../util.spec';
import {Projector} from '../projector';

import {ProjectorLinux} from './linux';

export function listSamples() {
	const platforms = new Set();
	if (shouldTest('linux32')) {
		platforms.add('linux');
		platforms.add('linux-i386');
	}
	if (shouldTest('linux64')) {
		platforms.add('linux-x86_64');
	}
	return getInstalledPackagesInfoSync()
		.filter(o => platforms.has(o.platform))
		.map(o => ({
			...o,
			type: o.platform === 'linux-x86_64' ? 'x86_64' : 'i386',
			patchProjectorPath: o.version[0] > 6
		}));
}

export const customWindowTitle =
	'Custom Window Title (Longer Than The Original Window Title Was)';

describe('projector/linux', () => {
	describe('ProjectorLinux', () => {
		it('instanceof Projector', () => {
			expect(ProjectorLinux.prototype instanceof Projector).toBeTrue();
		});

		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('linux', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application');

				const p = new ProjectorLinux(dest);
				await p.withFile(fixtureFile('dummy'), fixtureFile('swf3.swf'));
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('linux', pkg.type, pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux(dest);
					p.patchProjectorOffset = pkg.type === 'x86_64';
					await p.withFile(await getPlayer(), simple);
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux(dest);
					p.patchProjectorOffset = pkg.type === 'x86_64';
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

						const p = new ProjectorLinux(dest);
						p.patchProjectorOffset = pkg.type === 'x86_64';
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

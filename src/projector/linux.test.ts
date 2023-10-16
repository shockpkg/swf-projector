import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';
import {copyFile} from 'node:fs/promises';
import {join as pathJoin} from 'node:path';

import {cleanProjectorDir} from '../projector.spec';
import {
	fixtureFile,
	getPackageFile,
	simpleSwf,
	testShowMenu
} from '../util.spec';
import {Projector} from '../projector';

import {ProjectorLinux} from './linux';
import {customWindowTitle, listSamples} from './linux.spec';

describe('projector/linux', () => {
	describe('ProjectorLinux', () => {
		it('instanceof Projector', () => {
			strictEqual(ProjectorLinux.prototype instanceof Projector, true);
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
					p.patchProjectorOffset = pkg.patchProjectorOffset;
					await p.withFile(await getPlayer(), simple);
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorLinux(dest);
					p.patchProjectorOffset = pkg.patchProjectorOffset;
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
						p.patchProjectorOffset = pkg.patchProjectorOffset;
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

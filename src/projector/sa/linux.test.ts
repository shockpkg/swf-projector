import {describe, it} from 'node:test';
import {ok} from 'node:assert';
import {copyFile} from 'node:fs/promises';
import {join as pathJoin} from 'node:path';

import {
	cleanProjectorDir,
	fixtureFile,
	getPackageFile,
	simpleSwf,
	testShowMenu
} from '../../util.spec';
import {ProjectorSa} from '../sa';

import {ProjectorSaLinux} from './linux';
import {customWindowTitle, listSamples} from './linux.spec';

void describe('projector/sa/linux', () => {
	void describe('ProjectorSaLinux', () => {
		void it('instanceof', () => {
			ok(ProjectorSaLinux.prototype instanceof ProjectorSa);
		});

		void describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('sa', 'linux', 'dummy', d);

			void it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application');

				const p = new ProjectorSaLinux(dest);
				p.player = fixtureFile('dummy');
				p.movieFile = fixtureFile('swf3.swf');
				await p.write();
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('sa', 'linux', pkg.type, pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			void describe(pkg.name, () => {
				void it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorSaLinux(dest);
					p.patchProjectorOffset = pkg.patchProjectorOffset;
					p.player = await getPlayer();
					p.movieFile = simple;
					await p.write();
				});

				void it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application');

					const p = new ProjectorSaLinux(dest);
					p.patchProjectorOffset = pkg.patchProjectorOffset;
					p.patchProjectorPath = true;
					p.patchWindowTitle = customWindowTitle;
					p.patchMenuRemove = true;
					p.player = await getPlayer();

					if (pkg.version[0] < 6) {
						p.movieFile = fixtureFile('swf3.swf');
						await p.write();
					} else {
						p.movieFile = fixtureFile('swf6-loadmovie.swf');
						await p.write();
						await copyFile(
							fixtureFile('image.jpg'),
							pathJoin(dir, 'image.jpg')
						);
					}
				});

				if (pkg.version[0] >= 6 && testShowMenu) {
					void it('showmenu-false', async () => {
						const dir = await getDir('showmenu-false');
						const dest = pathJoin(dir, 'application');

						const p = new ProjectorSaLinux(dest);
						p.patchProjectorOffset = pkg.patchProjectorOffset;
						p.player = await getPlayer();
						p.movieFile = fixtureFile('swf6-showmenu-false.swf');
						await p.write();
					});
				}
			});
		}
	});
});

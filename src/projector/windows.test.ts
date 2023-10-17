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

import {ProjectorWindows} from './windows';
import {customWindowTitle, listSamples, versionStrings} from './windows.spec';

void describe('projector/windows', () => {
	void describe('ProjectorWindows', () => {
		void it('instanceof Projector', () => {
			strictEqual(ProjectorWindows.prototype instanceof Projector, true);
		});

		void describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('windows', 'dummy', d);

			void it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application.exe');

				const p = new ProjectorWindows(dest);
				p.player = fixtureFile('dummy.exe');
				await p.withFile(fixtureFile('swf3.swf'));
			});

			void it('archived', async () => {
				const dir = await getDir('archived');
				const dest = pathJoin(dir, 'application.exe');

				const p = new ProjectorWindows(dest);
				p.player = fixtureFile('dummy.exe.zip');
				await p.withFile(fixtureFile('swf3.swf'));
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('windows', pkg.type, pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			void describe(pkg.name, () => {
				void it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows(dest);
					p.removeCodeSignature = true;
					p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;
					p.player = await getPlayer();
					await p.withFile(simple);
				});

				void it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.exe');

					const p = new ProjectorWindows(dest);
					p.iconFile = fixtureFile('icon.ico');
					p.versionStrings = versionStrings;
					p.removeCodeSignature = true;
					p.patchWindowTitle = customWindowTitle;
					p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;
					p.player = await getPlayer();

					if (pkg.version[0] < 6) {
						await p.withFile(fixtureFile('swf3.swf'));
					} else {
						await p.withFile(fixtureFile('swf6-loadmovie.swf'));
						await copyFile(
							fixtureFile('image.jpg'),
							pathJoin(dir, 'image.jpg')
						);
					}
				});

				if (pkg.version[0] >= 6 && testShowMenu) {
					void it('showmenu-false', async () => {
						const dir = await getDir('showmenu-false');
						const dest = pathJoin(dir, 'application.exe');

						const p = new ProjectorWindows(dest);
						p.removeCodeSignature = true;
						p.patchOutOfDateDisable = pkg.patchOutOfDateDisable;
						p.player = await getPlayer();
						await p.withFile(
							fixtureFile('swf6-showmenu-false.swf')
						);
					});
				}
			});
		}
	});
});

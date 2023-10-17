import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';
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

import {ProjectorSaMac} from './mac';
import {customWindowTitle, listSamples} from './mac.spec';

void describe('projector/sa/mac', () => {
	void describe('ProjectorSaMac', () => {
		void it('instanceof', () => {
			strictEqual(ProjectorSaMac.prototype instanceof ProjectorSa, true);
		});

		void describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('sa', 'mac', 'dummy', d);

			void it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application.app');

				const p = new ProjectorSaMac(dest);
				p.player = fixtureFile('dummy.app');
				p.movieFile = fixtureFile('swf3.swf');
				await p.write();
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('sa', 'mac', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			void describe(pkg.name, () => {
				void it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorSaMac(dest);
					p.removeCodeSignature = true;
					p.player = await getPlayer();
					p.movieFile = simple;
					await p.write();
				});

				if (pkg.fixBrokenIconPaths) {
					void it('fixBrokenIconPaths', async () => {
						const dir = await getDir('fixBrokenIconPaths');
						const dest = pathJoin(dir, 'application.app');

						const p = new ProjectorSaMac(dest);
						p.fixBrokenIconPaths = true;
						p.removeCodeSignature = true;
						p.player = await getPlayer();
						p.movieFile = fixtureFile('swf3.swf');
						await p.write();
					});
				}

				void it('removeFileAssociations', async () => {
					const dir = await getDir('removeFileAssociations');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorSaMac(dest);
					p.removeFileAssociations = true;
					p.removeCodeSignature = true;
					p.player = await getPlayer();
					p.movieFile = fixtureFile('swf3.swf');
					await p.write();
				});

				void it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorSaMac(dest);
					p.iconFile = fixtureFile('icon.icns');
					p.infoPlistFile = fixtureFile('Info.plist');
					p.pkgInfoFile = fixtureFile('PkgInfo');
					p.binaryName = 'application';
					p.bundleName = 'App Bundle Name';
					p.removeInfoPlistStrings = true;
					p.removeCodeSignature = true;
					if (pkg.version[0] >= 11) {
						p.patchWindowTitle = customWindowTitle;
					}
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
						const dest = pathJoin(dir, 'application.app');

						const p = new ProjectorSaMac(dest);
						p.player = await getPlayer();
						p.movieFile = fixtureFile('swf6-showmenu-false.swf');
						await p.write();
					});
				}
			});
		}
	});
});

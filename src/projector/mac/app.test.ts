import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';
import {copyFile} from 'node:fs/promises';
import {join as pathJoin} from 'node:path';

import {cleanProjectorDir} from '../../projector.spec';
import {
	fixtureFile,
	getPackageFile,
	simpleSwf,
	testShowMenu
} from '../../util.spec';
import {ProjectorMac} from '../mac';

import {ProjectorMacApp} from './app';
import {customWindowTitle, listSamples} from './app.spec';

void describe('projector/mac/app', () => {
	void describe('ProjectorMacApp', () => {
		void it('instanceof ProjectorMac', () => {
			strictEqual(
				ProjectorMacApp.prototype instanceof ProjectorMac,
				true
			);
		});

		void describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('mac', 'app', 'dummy', d);

			void it('simple', async () => {
				const dir = await getDir('simple');
				const dest = pathJoin(dir, 'application.app');

				const p = new ProjectorMacApp(dest);
				await p.withFile(
					fixtureFile('dummy.app'),
					fixtureFile('swf3.swf')
				);
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('mac', 'app', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
			void describe(pkg.name, () => {
				void it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.removeCodeSignature = true;
					await p.withFile(await getPlayer(), simple);
				});

				if (pkg.fixBrokenIconPaths) {
					void it('fixBrokenIconPaths', async () => {
						const dir = await getDir('fixBrokenIconPaths');
						const dest = pathJoin(dir, 'application.app');

						const p = new ProjectorMacApp(dest);
						p.fixBrokenIconPaths = true;
						p.removeCodeSignature = true;
						await p.withFile(
							await getPlayer(),
							fixtureFile('swf3.swf')
						);
					});
				}

				void it('removeFileAssociations', async () => {
					const dir = await getDir('removeFileAssociations');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
					p.removeFileAssociations = true;
					p.removeCodeSignature = true;
					await p.withFile(
						await getPlayer(),
						fixtureFile('swf3.swf')
					);
				});

				void it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.app');

					const p = new ProjectorMacApp(dest);
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
					void it('showmenu-false', async () => {
						const dir = await getDir('showmenu-false');
						const dest = pathJoin(dir, 'application.app');

						const p = new ProjectorMacApp(dest);
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

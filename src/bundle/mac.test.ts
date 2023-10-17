import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';
import {join as pathJoin} from 'node:path';

import {listSamples, customWindowTitle} from '../projector/mac.spec';
import {cleanBundlesDir} from '../bundle.spec';
import {fixtureFile, getPackageFile, simpleSwf} from '../util.spec';
import {loader} from '../loader';
import {Bundle} from '../bundle';

import {BundleMac} from './mac';

void describe('bundle/mac/app', () => {
	void describe('BundleMac', () => {
		void it('instanceof', () => {
			strictEqual(BundleMac.prototype instanceof Bundle, true);
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('mac', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			void describe(pkg.name, () => {
				void it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.app');

					const b = new BundleMac(dest);
					b.projector.removeCodeSignature = true;
					b.projector.player = await getPlayer();
					b.projector.movieFile = simple;
					await b.write();
				});

				if (pkg.version[0] < 6) {
					return;
				}

				void it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.app');

					const b = new BundleMac(dest);
					b.projector.removeCodeSignature = true;
					b.projector.iconFile = fixtureFile('icon.icns');
					b.projector.infoPlistFile = fixtureFile('Info.plist');
					b.projector.pkgInfoFile = fixtureFile('PkgInfo');
					b.projector.binaryName = 'application';
					b.projector.bundleName = 'App Bundle Name';
					b.projector.removeInfoPlistStrings = true;
					if (pkg.version[0] >= 11) {
						b.projector.patchWindowTitle = customWindowTitle;
					}
					b.projector.player = await getPlayer();
					b.projector.movieData = loader(
						6,
						600,
						400,
						30,
						0xffffff,
						'main.swf'
					);
					await b.write(async b => {
						await b.copyResource(
							'main.swf',
							fixtureFile('swf6-loadmovie.swf')
						);
						await b.copyResource(
							'image.jpg',
							fixtureFile('image.jpg')
						);
					});
				});
			});
		}
	});
});

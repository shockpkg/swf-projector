import {join as pathJoin} from 'path';

import {listSamples} from '../../projector/mac/app.spec';
import {cleanBundlesDir} from '../../bundle.spec';
import {fixtureFile, getPackageFile, simpleSwf} from '../../util.spec';
import {loader} from '../../loader';
import {BundleMac} from '../mac';

import {BundleMacApp} from './app';

describe('bundle/mac/app', () => {
	describe('BundleMacApp', () => {
		it('instanceof BundleMac', () => {
			expect(BundleMacApp.prototype instanceof BundleMac).toBeTrue();
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('macapp', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.app');

					const b = new BundleMacApp(dest);
					b.projector.removeCodeSignature = true;
					await b.withFile(await getPlayer(), simple);
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.app');

					const b = new BundleMacApp(dest);
					b.projector.removeCodeSignature = true;
					b.projector.iconFile = fixtureFile('icon.icns');
					b.projector.infoPlistFile = fixtureFile('Info.plist');
					b.projector.pkgInfoFile = fixtureFile('PkgInfo');
					b.projector.binaryName = 'application';
					b.projector.bundleName = 'App Bundle Name';
					b.projector.removeInfoPlistStrings = true;
					await b.withData(
						await getPlayer(),
						loader(6, 600, 400, 30, 0xffffff, 'main.swf'),
						async b => {
							await b.copyResource(
								'main.swf',
								fixtureFile('swf6-loadmovie.swf')
							);
							await b.copyResource(
								'image.jpg',
								fixtureFile('image.jpg')
							);
						}
					);
				});
			});
		}
	});
});

import {
	join as pathJoin
} from 'path';

import {
	listSamples
} from '../../projector/mac/app.spec';
import {
	cleanBundlesDir
} from '../../bundle.spec';
import {
	fixtureFile,
	getPackageFile,
	simpleSwf
} from '../../util.spec';

import {
	BundleMacApp
} from './app';

describe('bundle/mac/app', () => {
	describe('BundleMacApp', () => {
		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('macapp', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

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
					await b.withFile(
						await getPlayer(),
						fixtureFile('swf6-loadmovie.swf'),
						async b => {
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

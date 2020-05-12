import {
	join as pathJoin
} from 'path';

import {
	listSamples
} from '../../projector/linux/32.spec';
import {
	cleanBundlesDir
} from '../../bundle.spec';
import {
	fixtureFile,
	getPackageFile,
	simpleSwf
} from '../../util.spec';

import {
	BundleLinux32
} from './32';

describe('bundle/linux/32', () => {
	describe('BundleLinux32', () => {
		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('linux32', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application');

					const b = new BundleLinux32(dest);
					await b.withFile(await getPlayer(), simple);
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application');

					const b = new BundleLinux32(dest);
					b.projector.patchProjectorPath = pkg.patchProjectorPath;
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

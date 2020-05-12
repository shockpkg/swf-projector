import {
	join as pathJoin
} from 'path';

import {
	listSamples
} from '../../projector/linux/64.spec';
import {
	cleanBundlesDir
} from '../../bundle.spec';
import {
	fixtureFile,
	getPackageFile,
	simpleSwf
} from '../../util.spec';

import {
	BundleLinux64
} from './64';

describe('bundle/linux/64', () => {
	describe('BundleLinux64', () => {
		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('linux64', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application');

					const b = new BundleLinux64(dest);
					b.projector.patchProjectorOffset = true;
					await b.withFile(await getPlayer(), simple);
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application');

					const b = new BundleLinux64(dest);
					b.projector.patchProjectorOffset = true;
					b.projector.patchProjectorPath = true;
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

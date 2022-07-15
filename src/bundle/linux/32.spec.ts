import {join as pathJoin} from 'path';

import {listSamples} from '../../projector/linux/32.spec';
import {cleanBundlesDir} from '../../bundle.spec';
import {fixtureFile, getPackageFile, simpleSwf} from '../../util.spec';
import {loader} from '../../loader';
import {BundleLinux} from '../linux';

import {BundleLinux32} from './32';

describe('bundle/linux/32', () => {
	describe('BundleLinux32', () => {
		it('instanceof BundleLinux', () => {
			expect(BundleLinux32.prototype instanceof BundleLinux).toBeTrue();
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('linux32', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
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
					await b.withData(
						await getPlayer(),
						loader(6, 600, 400, 30, 0xffffff, 'main.swf', 30 / 2),
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

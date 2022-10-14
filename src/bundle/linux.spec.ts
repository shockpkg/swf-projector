import {join as pathJoin} from 'path';

import {listSamples} from '../projector/linux.spec';
import {cleanBundlesDir} from '../bundle.spec';
import {fixtureFile, getPackageFile, simpleSwf} from '../util.spec';
import {loader} from '../loader';
import {Bundle} from '../bundle';

import {BundleLinux} from './linux';

describe('bundle/linux', () => {
	describe('BundleLinux', () => {
		it('instanceof BundleLinux', () => {
			expect(BundleLinux.prototype instanceof Bundle).toBeTrue();
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('linux', pkg.type, pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application');

					const b = new BundleLinux(dest);
					b.projector.patchProjectorOffset = pkg.patchProjectorOffset;
					await b.withFile(await getPlayer(), simple);
				});

				if (pkg.version[0] < 6) {
					return;
				}

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application');

					const b = new BundleLinux(dest);
					b.projector.patchProjectorOffset = pkg.patchProjectorOffset;
					b.projector.patchProjectorPath = true;
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

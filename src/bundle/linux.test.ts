import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';
import {join as pathJoin} from 'node:path';

import {listSamples} from '../projector/linux.spec';
import {cleanBundlesDir} from '../bundle.spec';
import {fixtureFile, getPackageFile, simpleSwf} from '../util.spec';
import {loader} from '../loader';
import {Bundle} from '../bundle';

import {BundleLinux} from './linux';

void describe('bundle/linux', () => {
	void describe('BundleLinux', () => {
		void it('instanceof BundleLinux', () => {
			strictEqual(BundleLinux.prototype instanceof Bundle, true);
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('linux', pkg.type, pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			void describe(pkg.name, () => {
				void it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application');

					const b = new BundleLinux(dest);
					b.projector.patchProjectorOffset = pkg.patchProjectorOffset;
					b.projector.player = await getPlayer();
					await b.withFile(simple);
				});

				if (pkg.version[0] < 6) {
					return;
				}

				void it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application');

					const b = new BundleLinux(dest);
					b.projector.patchProjectorOffset = pkg.patchProjectorOffset;
					b.projector.patchProjectorPath = true;
					b.projector.player = await getPlayer();
					await b.withData(
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

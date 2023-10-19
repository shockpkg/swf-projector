import {describe, it} from 'node:test';
import {ok} from 'node:assert';
import {join as pathJoin} from 'node:path';

import {listSamples} from '../../projector/sa/linux.spec';
import {
	cleanBundlesDir,
	fixtureFile,
	getPackageFile,
	simpleSwf
} from '../../util.spec';
import {loader} from '../../loader';
import {BundleSa} from '../sa';

import {BundleSaLinux} from './linux';

void describe('bundle/sa/linux', () => {
	void describe('BundleSaLinux', () => {
		void it('instanceof', () => {
			ok(BundleSaLinux.prototype instanceof BundleSa);
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('sa', 'linux', pkg.type, pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			void describe(pkg.name, () => {
				void it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application');

					const b = new BundleSaLinux(dest);
					b.projector.patchProjectorOffset = pkg.patchProjectorOffset;
					b.projector.player = await getPlayer();
					b.projector.movieFile = simple;
					await b.write();
				});

				if (pkg.version[0] < 6) {
					return;
				}

				void it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application');

					const b = new BundleSaLinux(dest);
					b.projector.patchProjectorOffset = pkg.patchProjectorOffset;
					b.projector.patchProjectorPath = true;
					b.projector.player = await getPlayer();
					b.projector.movieData = loader(
						6,
						600,
						400,
						30,
						0xffffff,
						'main.swf',
						30 / 2
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

				void it('flat', async () => {
					const dir = await getDir('flat');
					const dest = pathJoin(dir, 'application');

					const b = new BundleSaLinux(dest, true);
					b.projector.patchProjectorOffset = pkg.patchProjectorOffset;
					b.projector.patchProjectorPath = true;
					b.projector.player = await getPlayer();
					b.projector.movieData = loader(
						6,
						600,
						400,
						30,
						0xffffff,
						'main.swf',
						30 / 2
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

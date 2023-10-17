import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';
import {join as pathJoin} from 'node:path';

import {
	listSamples,
	customWindowTitle,
	versionStrings
} from '../projector/windows.spec';
import {cleanBundlesDir} from '../bundle.spec';
import {fixtureFile, getPackageFile, simpleSwf} from '../util.spec';
import {loader} from '../loader';
import {Bundle} from '../bundle';

import {BundleWindows} from './windows';

void describe('bundle/windows', () => {
	void describe('BundleWindows', () => {
		void it('instanceof Bundle', () => {
			strictEqual(BundleWindows.prototype instanceof Bundle, true);
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('windows', pkg.type, pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			void describe(pkg.name, () => {
				void it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.exe');

					const b = new BundleWindows(dest);
					b.projector.removeCodeSignature = true;
					b.projector.patchOutOfDateDisable =
						pkg.patchOutOfDateDisable;
					b.projector.player = await getPlayer();
					await b.withFile(simple);
				});

				if (pkg.version[0] < 4) {
					return;
				}

				const swfv = pkg.version[0] < 5 ? 4 : 5;
				const movies =
					pkg.version[0] < 6
						? ['swf4-loadmovie.swf', 'image.swf']
						: ['swf6-loadmovie.swf', 'image.jpg'];

				void it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.exe');

					const b = new BundleWindows(dest);
					b.projector.iconFile = fixtureFile('icon.ico');
					b.projector.versionStrings = versionStrings;
					b.projector.patchWindowTitle = customWindowTitle;
					b.projector.removeCodeSignature = true;
					b.projector.patchOutOfDateDisable =
						pkg.patchOutOfDateDisable;
					b.projector.player = await getPlayer();
					await b.withData(
						loader(swfv, 600, 400, 30, 0xffffff, 'main.swf'),
						async b => {
							await b.copyResource(
								'main.swf',
								fixtureFile(movies[0])
							);
							await b.copyResource(
								movies[1],
								fixtureFile(movies[1])
							);
						}
					);
				});
			});
		}
	});
});

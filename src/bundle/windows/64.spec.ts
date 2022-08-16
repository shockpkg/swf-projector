import {join as pathJoin} from 'path';

import {
	listSamples,
	customWindowTitle,
	versionStrings
} from '../../projector/windows/64.spec';
import {cleanBundlesDir} from '../../bundle.spec';
import {fixtureFile, getPackageFile, simpleSwf} from '../../util.spec';
import {loader} from '../../loader';
import {BundleWindows} from '../windows';

import {BundleWindows64} from './64';

describe('bundle/windows/64', () => {
	describe('BundleWindows64', () => {
		it('instanceof BundleWindows', () => {
			expect(
				BundleWindows64.prototype instanceof BundleWindows
			).toBeTrue();
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('windows64', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			// eslint-disable-next-line no-loop-func
			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.exe');

					const b = new BundleWindows64(dest);
					b.projector.removeCodeSignature = true;
					await b.withFile(await getPlayer(), simple);
				});

				if (pkg.version[0] < 4) {
					return;
				}

				const swfv = pkg.version[0] < 5 ? 4 : 5;
				const movies =
					pkg.version[0] < 6
						? ['swf4-loadmovie.swf', 'image.swf']
						: ['swf6-loadmovie.swf', 'image.jpg'];

				it('complex', async () => {
					const dir = await getDir('complex');
					const dest = pathJoin(dir, 'application.exe');

					const b = new BundleWindows64(dest);
					b.projector.iconFile = fixtureFile('icon.ico');
					b.projector.versionStrings = versionStrings;
					b.projector.patchWindowTitle = customWindowTitle;
					b.projector.removeCodeSignature = true;
					await b.withData(
						await getPlayer(),
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

import {describe, it} from 'node:test';
import {ok} from 'node:assert';
import {join as pathJoin} from 'node:path';

import {
	listSamples,
	customWindowTitle,
	versionStrings
} from '../../projector/sa/windows.spec.ts';
import {
	cleanBundlesDir,
	fixtureFile,
	getPackageFile,
	simpleSwf
} from '../../util.spec.ts';
import {loader} from '../../loader.ts';
import {BundleSa} from '../sa.ts';

import {BundleSaWindows} from './windows.ts';

void describe('bundle/sa/windows', () => {
	void describe('BundleSaWindows', () => {
		void it('instanceof', () => {
			ok(BundleSaWindows.prototype instanceof BundleSa);
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanBundlesDir('sa', 'windows', pkg.type, pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);
			const simple = fixtureFile(simpleSwf(pkg.zlib, pkg.lzma));

			void describe(pkg.name, () => {
				void it('simple', async () => {
					const dir = await getDir('simple');
					const dest = pathJoin(dir, 'application.exe');

					const b = new BundleSaWindows(dest);
					b.projector.removeCodeSignature = true;
					b.projector.patchOutOfDateDisable =
						pkg.patchOutOfDateDisable;
					b.projector.player = await getPlayer();
					b.projector.movieFile = simple;
					await b.write();
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

					const b = new BundleSaWindows(dest);
					b.projector.iconFile = fixtureFile('icon.ico');
					b.projector.versionStrings = versionStrings;
					b.projector.patchWindowTitle = customWindowTitle;
					b.projector.removeCodeSignature = true;
					b.projector.patchOutOfDateDisable =
						pkg.patchOutOfDateDisable;
					b.projector.player = await getPlayer();
					b.projector.movieData = loader(
						swfv,
						600,
						400,
						30,
						0xffffff,
						'main.swf'
					);
					await b.write(async b => {
						await b.copyResource(
							'main.swf',
							fixtureFile(movies[0])
						);
						await b.copyResource(movies[1], fixtureFile(movies[1]));
					});
				});

				void it('flat', async () => {
					const dir = await getDir('flat');
					const dest = pathJoin(dir, 'application.exe');

					const b = new BundleSaWindows(dest, true);
					b.projector.removeCodeSignature = true;
					b.projector.patchOutOfDateDisable =
						pkg.patchOutOfDateDisable;
					b.projector.player = await getPlayer();
					b.projector.movieData = loader(
						swfv,
						600,
						400,
						30,
						0xffffff,
						'main.swf'
					);
					await b.write(async b => {
						await b.copyResource(
							'main.swf',
							fixtureFile(movies[0])
						);
						await b.copyResource(movies[1], fixtureFile(movies[1]));
					});
				});
			});
		}
	});
});

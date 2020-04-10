import fse from 'fs-extra';

import {
	cleanProjectorDir,
	fixtureFile,
	getPackageFile,
	platformIsMac,
	shouldTest,
	getInstalledPackagesSync
} from '../util.spec';

import {
	ProjectorMacApp
} from './macapp';

const doTest = platformIsMac && shouldTest('macapp');

function listSamples() {
	const r: {
		name: string;
		version: number[];
		debug: boolean;
		lzma: boolean;
		fixBrokenIconPaths: boolean;
	}[] = [];
	if (!doTest) {
		return r;
	}
	const fixBrokenIconPathsSet = new Set([
		'flash-player-9.0.28.0-mac-sa-debug',
		'flash-player-9.0.45.0-mac-sa-debug'
	]);

	for (const name of getInstalledPackagesSync()) {
		const m = name.match(
			/^flash-player-([\d.]+)-mac-sa(-debug)?$/
		);
		if (!m) {
			continue;
		}

		const version = m[1].split('.').map(Number);
		const debug = !!m[2];
		const lzma = version[0] > 11 || (version[0] === 11 && version[1] >= 1);
		const fixBrokenIconPaths = fixBrokenIconPathsSet.has(name);
		r.push({
			name,
			version,
			debug,
			lzma,
			fixBrokenIconPaths
		});
	}

	r.sort((a, b) => (+a.debug) - (+b.debug));
	for (let i = 4; i--;) {
		r.sort((a, b) => (a.version[i] || 0) - (b.version[i] || 0));
	}
	return r;
}

// Always remove signature, avoid Gatekeeper issues.
const removeCodeSignature = true;

describe('projectors/macapp', () => {
	describe('ProjectorMacApp', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'macapp', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				await (new ProjectorMacApp({
					player: fixtureFile('dummy.app'),
					movieFile: fixtureFile('swf3.swf'),
					removeCodeSignature: false
				})).write(dir, 'application.app');
			});
		});

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'macapp', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						removeCodeSignature
					})).write(dir, 'application.app');
				});

				it('zlib', async () => {
					const dir = await getDir('zlib');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-zlib.swf'),
						removeCodeSignature
					})).write(dir, 'application.app');
				});

				if (pkg.lzma) {
					it('lzma', async () => {
						const dir = await getDir('lzma');
						await (new ProjectorMacApp({
							player: await getPlayer(),
							movieFile: fixtureFile('swf14-lzma.swf'),
							removeCodeSignature
						})).write(dir, 'application.app');
					});
				}

				if (pkg.fixBrokenIconPaths) {
					it('fixBrokenIconPaths', async () => {
						const dir = await getDir('fixBrokenIconPaths');
						await (new ProjectorMacApp({
							player: await getPlayer(),
							movieFile: fixtureFile('swf3.swf'),
							fixBrokenIconPaths: true,
							removeCodeSignature
						})).write(dir, 'application.app');
					});
				}

				it('removeFileAssociations', async () => {
					const dir = await getDir('removeFileAssociations');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						removeFileAssociations: true,
						removeCodeSignature
					})).write(dir, 'application.app');
				});

				it('complex', async () => {
					const dir = await getDir('complex');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						iconFile: fixtureFile('icon.icns'),
						infoPlistFile: fixtureFile('Info.plist'),
						pkgInfoFile: fixtureFile('PkgInfo'),
						binaryName: 'application',
						removeCodeSignature
					})).write(dir, 'application.app');
				});

				it('loadmovie', async () => {
					const dir = await getDir('loadmovie');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-loadmovie.swf')
					})).write(dir, 'application');
					await fse.copy(
						fixtureFile('image.jpg'),
						`${dir}/image.jpg`
					);
				});

				it('showmenu-false', async () => {
					const dir = await getDir('showmenu-false');
					await (new ProjectorMacApp({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-showmenu-false.swf')
					})).write(dir, 'application');
				});
			});
		}
	});
});

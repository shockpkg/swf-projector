// tslint:disable:completed-docs

import {
	cleanProjectorDir,
	fixtureFile,
	getPackageFile,
	platformIsMac,
	shouldTest
} from '../util.spec';

import {
	ProjectorMacApp
} from './macapp';

interface ISample {
	lzma?: boolean;
	fixBrokenIconPaths?: boolean;
}

const doTest = platformIsMac && shouldTest('macapp');

const samples: {[index: string]: ISample} = doTest ? {
	// First Mac APP bundle, broken icon, DMG:
	'flash-player-9.0.28.0-mac-sa-debug': {
		fixBrokenIconPaths: true
	},

	// Early Mac APP bundle, broken icon, ZIP:
	'flash-player-9.0.45.0-mac-sa-debug': {
		fixBrokenIconPaths: true
	},

	// First Mac APP, correct icon, ZIP:
	'flash-player-9.0.115.0-mac-sa': {},

	// First Mac APP, correct icon, debug, ZIP:
	'flash-player-9.0.115.0-mac-sa-debug': {},

	// Last 9.0 before 10.0:
	'flash-player-9.0.280.0-mac-sa': {},

	// Last 9.0:
	'flash-player-9.0.289.0-mac-sa': {},

	// Last 10.0:
	'flash-player-10.0.12.36-mac-sa': {},

	// Last before code-signing:
	'flash-player-10.0.45.2-mac-sa-debug': {},

	// First code-signed:
	'flash-player-10.1.53.64-mac-sa': {},

	// Revoked cert:
	'flash-player-10.1.102.64-mac-sa': {},

	// First 10.2, revoked cert:
	'flash-player-10.2.152.26-mac-sa': {},

	// Last PPC:
	'flash-player-10.2.153.1-mac-sa': {},

	// Last 10.2, revoked cert, no PPC:
	'flash-player-10.2.159.1-mac-sa': {},

	// First 10.3, not code-signed:
	'flash-player-10.3.181.14-mac-sa': {},

	// Last 10.3, code-signed:
	'flash-player-10.3.183.90-mac-sa': {},

	// Only 11.0, first i386/x86_64, revoked cert:
	'flash-player-11.0.1.152-mac-sa': {},

	// First 11.1:
	'flash-player-11.1.102.55-mac-sa': {
		lzma: true
	},

	// Last signature V1:
	'flash-player-15.0.0.152-mac-sa-debug': {
		lzma: true
	},

	// First signature V2:
	'flash-player-15.0.0.189-mac-sa-debug': {
		lzma: true
	},

	// Latest release:
	'flash-player-32.0.0.223-mac-sa': {
		lzma: true
	},

	// Latest debug:
	'flash-player-32.0.0.223-mac-sa-debug': {
		lzma: true
	}
} : {};

// Always remove signature if possible, avoid Gatekeeper issues.
const removeCodeSignature = platformIsMac;

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
					removeCodeSignature
				})).write(dir, 'application.app');
			});
		});

		for (const pkg of Object.keys(samples)) {
			const o = samples[pkg];
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'macapp', pkg, d);
			const getPlayer = async () => getPackageFile(pkg);

			describe(pkg, () => {
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

				if (o.lzma) {
					it('lzma', async () => {
						const dir = await getDir('lzma');
						await (new ProjectorMacApp({
							player: await getPlayer(),
							movieFile: fixtureFile('swf14-lzma.swf'),
							removeCodeSignature
						})).write(dir, 'application.app');
					});
				}

				if (o.fixBrokenIconPaths) {
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
			});
		}
	});
});

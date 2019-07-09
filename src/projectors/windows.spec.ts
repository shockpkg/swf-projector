// tslint:disable:completed-docs

import {
	cleanProjectorDir,
	fixtureFile,
	getPackageFile,
	platformIsWindows,
	shouldTest
} from '../util.spec';

import {
	ProjectorWindows
} from './windows';

// tslint:disable-next-line no-empty-interface
interface ISample {
	zlib?: boolean;
	lzma?: boolean;
}

const samples: {[index: string]: ISample} = shouldTest('windows') ? {
	// Only 3.0 32-bit:
	'flash-player-3.0.8.0-windows-32bit-sa': {},

	// Only 4.0:
	'flash-player-4.0.7.0-windows-sa': {},

	// Only 5.0, release:
	'flash-player-5.0.30.0-windows-sa': {},

	// First debug:
	'flash-player-5.0.30.0-windows-sa-debug': {},

	// First 6.0:
	'flash-player-6.0.21.0-windows-sa': {
		zlib: true
	},

	// Last 6.0:
	'flash-player-6.0.79.0-windows-sa': {
		zlib: true
	},

	// First 7.0:
	'flash-player-7.0.14.0-windows-sa': {
		zlib: true
	},

	// Last 7.0:
	'flash-player-7.0.19.0-windows-sa': {
		zlib: true
	},

	// First 8.0:
	'flash-player-8.0.22.0-windows-sa': {
		zlib: true
	},

	// Last 8.0:
	'flash-player-8.0.42.0-windows-sa': {
		zlib: true
	},

	// First 9.0, first code-signed:
	'flash-player-9.0.15.0-windows-sa-debug': {
		zlib: true
	},

	// First 9.0 release:
	'flash-player-9.0.115.0-windows-sa': {
		zlib: true
	},

	// Last 9.0 before 10.0:
	'flash-player-9.0.280.0-windows-sa': {
		zlib: true
	},

	// Last 9.0:
	'flash-player-9.0.289.0-windows-sa': {
		zlib: true
	},

	// First 10.0:
	'flash-player-10.0.12.36-windows-sa': {
		zlib: true
	},

	// Last 10.0:
	'flash-player-10.0.45.2-windows-sa': {
		zlib: true
	},

	// Last 10.3, not code-signed:
	'flash-player-10.3.183.90-windows-sa': {
		zlib: true
	},

	// First 11.1:
	'flash-player-11.1.102.55-windows-32bit-sa': {
		zlib: true,
		lzma: true
	},

	// Latest release:
	'flash-player-32.0.0.223-windows-sa': {
		zlib: true,
		lzma: true
	},

	// Latest debug:
	'flash-player-32.0.0.223-windows-sa-debug': {
		zlib: true,
		lzma: true
	}
} : {};

const fileVersion = '3.14.15.92';
const productVersion = '3.1.4.1';
const versionStrings = {
	CompanyName: 'Custom Company Name',
	FileDescription: 'Custom File Description',
	LegalCopyright: 'Custom Legal Copyright',
	ProductName: 'Custom Pruduct Name',
	LegalTrademarks: 'Custom Legal Trademarks',
	OriginalFilename: 'CustomOriginalFilename.exe',
	InternalName: 'CustomInternalName',
	Comments: 'Custom Comments'
};

const removeCodeSignature = platformIsWindows;

describe('projectors/windows', () => {
	describe('ProjectorWindows', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'windows', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				await (new ProjectorWindows({
					player: fixtureFile('dummy.exe'),
					movieFile: fixtureFile('swf3.swf'),
					removeCodeSignature
				})).write(dir, 'application.exe');
			});

			it('archived', async () => {
				const dir = await getDir('archived');
				await (new ProjectorWindows({
					player: fixtureFile('dummy.exe.zip'),
					movieFile: fixtureFile('swf3.swf'),
					removeCodeSignature
				})).write(dir, 'application.exe');
			});
		});

		for (const pkg of Object.keys(samples)) {
			const o = samples[pkg];
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'windows', pkg, d);
			const getPlayer = async () => getPackageFile(pkg);

			describe(pkg, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					await (new ProjectorWindows({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						removeCodeSignature
					})).write(dir, 'application.exe');
				});

				if (o.zlib) {
					it('zlib', async () => {
						const dir = await getDir('zlib');
						await (new ProjectorWindows({
							player: await getPlayer(),
							movieFile: fixtureFile('swf6-zlib.swf'),
							removeCodeSignature
						})).write(dir, 'application.exe');
					});
				}

				if (o.lzma) {
					it('lzma', async () => {
						const dir = await getDir('lzma');
						await (new ProjectorWindows({
							player: await getPlayer(),
							movieFile: fixtureFile('swf14-lzma.swf'),
							removeCodeSignature
						})).write(dir, 'application.exe');
					});
				}

				// tslint:disable-next-line: early-exit
				if (platformIsWindows) {
					it('rcedit', async () => {
						const dir = await getDir('rcedit');
						await (new ProjectorWindows({
							player: await getPlayer(),
							movieFile: fixtureFile('swf3.swf'),
							iconFile: fixtureFile('icon.ico'),
							fileVersion,
							productVersion,
							versionStrings,
							removeCodeSignature
						})).write(dir, 'application.exe');
					});
				}
			});
		}
	});
});

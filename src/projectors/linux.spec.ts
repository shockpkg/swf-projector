// tslint:disable:completed-docs

import {
	cleanProjectorDir,
	fixtureFile,
	getPackageFile
} from '../util.spec';

import {
	ProjectorLinux
} from './linux';

// tslint:disable-next-line no-empty-interface
interface ISample {
	lzma?: boolean;
}

const samples: {[index: string]: ISample} = {
	// Only 6.0, first version:
	'flash-player-6.0.79.0-linux-sa': {},

	// First 9.0
	'flash-player-9.0.115.0-linux-sa': {},

	// First debug:
	'flash-player-9.0.115.0-linux-sa-debug': {},

	// Last 9.0 before 10.0:
	'flash-player-9.0.280.0-linux-sa': {},

	// Last 9.0:
	'flash-player-9.0.289.0-linux-sa': {},

	// First 10.0:
	'flash-player-10.0.12.36-linux-sa': {},

	// Last 10.3:
	'flash-player-10.3.183.90-linux-sa': {},

	// First 11.0 release:
	'flash-player-11.0.1.152-linux-i386-sa': {},

	// First 11.0 debug:
	'flash-player-11.0.1.152-linux-i386-sa-debug': {},

	// First 11.1:
	'flash-player-11.1.102.55-linux-i386-sa': {
		lzma: true
	},

	// Last 11.2 release, last i386, before long release break:
	'flash-player-11.2.202.644-linux-i386-sa': {
		lzma: true
	},

	// Last 11.2 debug, last i386, before long release break:
	'flash-player-11.2.202.644-linux-i386-sa-debug': {
		lzma: true
	},

	// Unfortuantely, it seems the deprecated Projector functionality is dead.
	// The newer 64-bit releases do not support it.

	// // First 24.0 release, first x86_64:
	// 'flash-player-24.0.0.186-linux-x86_64-sa': {
	// 	lzma: true
	// },
	//
	// // First 24.0 debug, first x86_64:
	// 'flash-player-24.0.0.186-linux-x86_64-sa-debug': {
	// 	lzma: true
	// },
	//
	// // Latest release:
	// 'flash-player-32.0.0.192-linux-x86_64-sa': {
	// 	lzma: true
	// },
	//
	// // Latest debug:
	// 'flash-player-32.0.0.192-linux-x86_64-sa-debug': {
	// 	lzma: true
	// }
};

describe('projectors/linux', () => {
	describe('ProjectorLinux', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'linux', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				await (new ProjectorLinux({
					player: fixtureFile('dummy'),
					movieFile: fixtureFile('swf3.swf')
				})).write(dir, 'application');
			});
		});

		for (const pkg of Object.keys(samples)) {
			const o = samples[pkg];
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'linux', pkg, d);
			const getPlayer = async () => getPackageFile(pkg);

			describe(pkg, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					await (new ProjectorLinux({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
					})).write(dir, 'application');
				});

				it('zlib', async () => {
					const dir = await getDir('zlib');
					await (new ProjectorLinux({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-zlib.swf'),
					})).write(dir, 'application');
				});

				// tslint:disable-next-line: early-exit
				if (o.lzma) {
					it('lzma', async () => {
						const dir = await getDir('lzma');
						await (new ProjectorLinux({
							player: await getPlayer(),
							movieFile: fixtureFile('swf14-lzma.swf'),
						})).write(dir, 'application');
					});
				}
			});
		}
	});
});

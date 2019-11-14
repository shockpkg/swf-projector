import {
	cleanProjectorDir,
	fixtureFile,
	getPackageFile,
	shouldTest
} from '../util.spec';

import {
	ProjectorLinux64
} from './linux64';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ISample {
}

const samples: {[index: string]: ISample} = shouldTest('linux64') ? {
	'flash-player-24.0.0.186-linux-x86_64-sa': {},
	'flash-player-24.0.0.186-linux-x86_64-sa-debug': {},
	'flash-player-24.0.0.194-linux-x86_64-sa': {},
	'flash-player-24.0.0.194-linux-x86_64-sa-debug': {},
	'flash-player-24.0.0.221-linux-x86_64-sa': {},
	'flash-player-24.0.0.221-linux-x86_64-sa-debug': {},
	'flash-player-25.0.0.127-linux-x86_64-sa': {},
	'flash-player-25.0.0.127-linux-x86_64-sa-debug': {},
	'flash-player-25.0.0.148-linux-x86_64-sa': {},
	'flash-player-25.0.0.148-linux-x86_64-sa-debug': {},
	'flash-player-25.0.0.171-linux-x86_64-sa': {},
	'flash-player-25.0.0.171-linux-x86_64-sa-debug': {},
	'flash-player-26.0.0.126-linux-x86_64-sa': {},
	'flash-player-26.0.0.126-linux-x86_64-sa-debug': {},
	'flash-player-26.0.0.131-linux-x86_64-sa': {},
	'flash-player-26.0.0.131-linux-x86_64-sa-debug': {},
	'flash-player-26.0.0.137-linux-x86_64-sa': {},
	'flash-player-26.0.0.137-linux-x86_64-sa-debug': {},
	'flash-player-26.0.0.151-linux-x86_64-sa': {},
	'flash-player-26.0.0.151-linux-x86_64-sa-debug': {},
	'flash-player-27.0.0.130-linux-x86_64-sa': {},
	'flash-player-27.0.0.130-linux-x86_64-sa-debug': {},
	'flash-player-27.0.0.159-linux-x86_64-sa': {},
	'flash-player-27.0.0.159-linux-x86_64-sa-debug': {},
	'flash-player-27.0.0.170-linux-x86_64-sa': {},
	'flash-player-27.0.0.170-linux-x86_64-sa-debug': {},
	'flash-player-27.0.0.183-linux-x86_64-sa': {},
	'flash-player-27.0.0.183-linux-x86_64-sa-debug': {},
	'flash-player-27.0.0.187-linux-x86_64-sa': {},
	'flash-player-27.0.0.187-linux-x86_64-sa-debug': {},
	'flash-player-28.0.0.126-linux-x86_64-sa': {},
	'flash-player-28.0.0.126-linux-x86_64-sa-debug': {},
	'flash-player-28.0.0.137-linux-x86_64-sa': {},
	'flash-player-28.0.0.137-linux-x86_64-sa-debug': {},
	'flash-player-28.0.0.161-linux-x86_64-sa': {},
	'flash-player-28.0.0.161-linux-x86_64-sa-debug': {},
	'flash-player-29.0.0.113-linux-x86_64-sa': {},
	'flash-player-29.0.0.113-linux-x86_64-sa-debug': {},
	'flash-player-29.0.0.140-linux-x86_64-sa': {},
	'flash-player-29.0.0.140-linux-x86_64-sa-debug': {},
	'flash-player-29.0.0.171-linux-x86_64-sa': {},
	'flash-player-29.0.0.171-linux-x86_64-sa-debug': {},
	'flash-player-30.0.0.113-linux-x86_64-sa': {},
	'flash-player-30.0.0.113-linux-x86_64-sa-debug': {},
	'flash-player-30.0.0.134-linux-x86_64-sa': {},
	'flash-player-30.0.0.134-linux-x86_64-sa-debug': {},
	'flash-player-30.0.0.154-linux-x86_64-sa': {},
	'flash-player-30.0.0.154-linux-x86_64-sa-debug': {},
	'flash-player-31.0.0.108-linux-x86_64-sa': {},
	'flash-player-31.0.0.108-linux-x86_64-sa-debug': {},
	'flash-player-31.0.0.122-linux-x86_64-sa': {},
	'flash-player-31.0.0.122-linux-x86_64-sa-debug': {},
	'flash-player-31.0.0.148-linux-x86_64-sa': {},
	'flash-player-31.0.0.148-linux-x86_64-sa-debug': {},
	'flash-player-31.0.0.153-linux-x86_64-sa': {},
	'flash-player-31.0.0.153-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.101-linux-x86_64-sa': {},
	'flash-player-32.0.0.101-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.114-linux-x86_64-sa': {},
	'flash-player-32.0.0.114-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.142-linux-x86_64-sa': {},
	'flash-player-32.0.0.142-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.156-linux-x86_64-sa': {},
	'flash-player-32.0.0.156-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.171-linux-x86_64-sa': {},
	'flash-player-32.0.0.171-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.192-linux-x86_64-sa': {},
	'flash-player-32.0.0.192-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.207-linux-x86_64-sa': {},
	'flash-player-32.0.0.207-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.223-linux-x86_64-sa': {},
	'flash-player-32.0.0.223-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.238-linux-x86_64-sa': {},
	'flash-player-32.0.0.238-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.255-linux-x86_64-sa': {},
	'flash-player-32.0.0.255-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.270-linux-x86_64-sa': {},
	'flash-player-32.0.0.270-linux-x86_64-sa-debug': {},
	'flash-player-32.0.0.293-linux-x86_64-sa': {},
	'flash-player-32.0.0.293-linux-x86_64-sa-debug': {}
} : {};

describe('projectors/linux64', () => {
	describe('ProjectorLinux64', () => {
		describe('dummy', () => {
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'linux64', 'dummy', d);

			it('simple', async () => {
				const dir = await getDir('simple');
				await (new ProjectorLinux64({
					player: fixtureFile('dummy'),
					movieFile: fixtureFile('swf3.swf')
				})).write(dir, 'application');
			});
		});

		for (const pkg of Object.keys(samples)) {
			// const o = samples[pkg];
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'linux64', pkg, d);
			const getPlayer = async () => getPackageFile(pkg);

			describe(pkg, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					await (new ProjectorLinux64({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf'),
						patchProjectorOffset: true
					})).write(dir, 'application');
				});
			});
		}
	});
});

import {
	cleanProjectorDir,
	fixtureFile,
	getPackageFile,
	shouldTest,
	getInstalledPackagesSync
} from '../util.spec';

import {
	ProjectorLinux
} from './linux';

function listSamples() {
	const r: {
		name: string;
		version: number[];
		debug: boolean;
		lzma: boolean;
	}[] = [];
	if (!shouldTest('linux')) {
		return r;
	}

	for (const name of getInstalledPackagesSync()) {
		const m = name.match(
			/^flash-player-([\d.]+)-linux(-i386)?-sa(-debug)?$/
		);
		if (!m) {
			continue;
		}

		const version = m[1].split('.').map(Number);
		const debug = !!m[3];
		const lzma = version[0] > 11 || (version[0] === 11 && version[1] >= 1);
		r.push({
			name,
			version,
			debug,
			lzma
		});
	}

	r.sort((a, b) => (+a.debug) - (+b.debug));
	for (let i = 4; i--;) {
		r.sort((a, b) => (a.version[i] || 0) - (b.version[i] || 0));
	}
	return r;
}

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

		for (const pkg of listSamples()) {
			const getDir = async (d: string) =>
				cleanProjectorDir('projectors', 'linux', pkg.name, d);
			const getPlayer = async () => getPackageFile(pkg.name);

			describe(pkg.name, () => {
				it('simple', async () => {
					const dir = await getDir('simple');
					await (new ProjectorLinux({
						player: await getPlayer(),
						movieFile: fixtureFile('swf3.swf')
					})).write(dir, 'application');
				});

				it('zlib', async () => {
					const dir = await getDir('zlib');
					await (new ProjectorLinux({
						player: await getPlayer(),
						movieFile: fixtureFile('swf6-zlib.swf')
					})).write(dir, 'application');
				});

				if (pkg.lzma) {
					it('lzma', async () => {
						const dir = await getDir('lzma');
						await (new ProjectorLinux({
							player: await getPlayer(),
							movieFile: fixtureFile('swf14-lzma.swf')
						})).write(dir, 'application');
					});
				}
			});
		}
	});
});

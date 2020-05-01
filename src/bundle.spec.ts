import {
	join as pathJoin,
	dirname,
	basename
} from 'path';

import fse from 'fs-extra';
import {
	fsLchmod,
	fsLutimes
} from '@shockpkg/archive-files';

import {trimExtension} from './util';
import {fixtureFile} from './util.spec';
import {ProjectorDummy} from './projector.spec';
import {Bundle} from './bundle';

export const specBundlesPath = pathJoin('spec', 'bundles');

export async function cleanBundlesDir(...path: string[]) {
	const dir = pathJoin(specBundlesPath, ...path);
	await fse.remove(dir);
	await fse.ensureDir(dir);
	return dir;
}

const getDir = async (d: string) =>
	cleanBundlesDir('dummy', d);

const supportsExecutable = !process.platform.startsWith('win');
const supportsSymlinks = !process.platform.startsWith('win');
const supportsSymlinkAttrs = process.platform.startsWith('darwin');

// eslint-disable-next-line no-bitwise
const isUserExec = (mode: number) => !!(mode & 0b001000000);

class BundleDummy extends Bundle {
	public readonly projector: ProjectorDummy;

	constructor(path: string) {
		super(path);

		this.projector = this._createProjector();
	}

	public get extension() {
		return '.exe';
	}

	public resourcePath(destination: string) {
		return pathJoin(dirname(this.projector.path), destination);
	}

	protected _createProjector() {
		const {path, extension} = this;
		const directory = trimExtension(path, extension, true);
		if (directory === path) {
			throw new Error(`Output path must end with: ${extension}`);
		}
		return new ProjectorDummy(pathJoin(directory, basename(path)));
	}

	protected async _close() {
		await super._close();

		await fse.outputFile(this.path, 'DUMMY_PE_LAUNCHER_EXE\n', 'utf8');
	}
}

describe('bundle', () => {
	describe('BundleDummy', () => {
		it('simple', async () => {
			const dir = await getDir('simple');
			const dest = pathJoin(dir, 'application.exe');

			const p = new BundleDummy(dest);
			await p.withFile(
				fixtureFile('dummy.exe'),
				fixtureFile('swf3.swf')
			);
		});

		it('resources', async () => {
			const dir = await getDir('resources');
			const dest = pathJoin(dir, 'application.exe');

			const dateA = new Date('2001-06-15');
			const dateB = new Date('2002-06-15');

			const resources = pathJoin(dir, 'resources');
			const resourcesA = pathJoin(resources, 'a.txt');
			const resourcesB = pathJoin(resources, 'd/b.txt');
			const resourcesL1 = pathJoin(resources, 'l1.txt');
			const resourcesL2 = pathJoin(resources, 'l2.txt');

			await fse.ensureDir(resources);

			await fse.outputFile(resourcesA, 'alpha');
			await fse.chmod(resourcesA, 0o666);
			await fse.utimes(resourcesA, dateA, dateA);

			await fse.outputFile(resourcesB, 'beta');
			await fse.chmod(resourcesB, 0o777);
			await fse.utimes(resourcesB, dateA, dateA);

			if (supportsSymlinks) {
				await fse.symlink('a.txt', resourcesL1);
				await fse.symlink('a.txt', resourcesL2);

				if (supportsSymlinkAttrs) {
					await fsLchmod(resourcesL1, 0o777);
					await fsLutimes(resourcesL1, dateA, dateA);

					await fsLchmod(resourcesL2, 0o666);
					await fsLutimes(resourcesL2, dateA, dateA);
				}
			}

			await fse.utimes(resources, dateA, dateA);

			const p = new BundleDummy(dest);
			await p.withFile(
				fixtureFile('dummy.exe'),
				fixtureFile('swf3.swf'),
				async p => {
					await p.copyResource(
						'resources0',
						resources
					);

					await p.copyResource(
						'resources1',
						resources,
						{
							atimeCopy: true,
							mtimeCopy: true,
							executableCopy: true
						}
					);

					await p.copyResource(
						'resources2/a.txt',
						resourcesA,
						{
							atime: dateB,
							mtime: dateB,
							executable: true
						}
					);
					await p.copyResource(
						'resources2/d/b.txt',
						resourcesB,
						{
							atime: dateB,
							mtime: dateB,
							executable: false
						}
					);

					if (supportsSymlinks) {
						await p.copyResource(
							'resources2/l1.txt',
							resourcesL1,
							{
								atime: dateB,
								mtime: dateB,
								executable: true
							}
						);
						await p.copyResource(
							'resources2/l2.txt',
							resourcesL2,
							{
								atime: dateB,
								mtime: dateB,
								executable: false
							}
						);
					}
				}
			);

			await fse.remove(resources);

			const st = async (path: string) => fse.lstat(p.resourcePath(path));

			const res0 = await st('resources0');
			expect(res0.atime.getFullYear()).not.toBe(2001);
			expect(res0.mtime.getFullYear()).not.toBe(2001);

			const res0A = await st('resources0/a.txt');
			expect(res0A.atime.getFullYear()).not.toBe(2001);
			expect(res0A.mtime.getFullYear()).not.toBe(2001);
			if (supportsExecutable) {
				expect(isUserExec(res0A.mode)).toBeFalse();
			}

			const res0B = await st('resources0/d/b.txt');
			expect(res0B.atime.getFullYear()).not.toBe(2001);
			expect(res0B.mtime.getFullYear()).not.toBe(2001);
			if (supportsExecutable) {
				expect(isUserExec(res0B.mode)).toBeFalse();
			}

			if (supportsSymlinks) {
				const res0L1 = await st('resources0/l1.txt');
				const res0L2 = await st('resources0/l2.txt');

				if (supportsSymlinkAttrs) {
					expect(res0L1.atime.getFullYear()).not.toBe(2001);
					expect(res0L1.mtime.getFullYear()).not.toBe(2001);

					expect(res0L2.atime.getFullYear()).not.toBe(2001);
					expect(res0L2.mtime.getFullYear()).not.toBe(2001);
				}
			}

			const res1 = await st('resources1');
			expect(res1.atime.getFullYear()).toBe(2001);
			expect(res1.mtime.getFullYear()).toBe(2001);

			const res1A = await st('resources1/a.txt');
			expect(res1A.atime.getFullYear()).toBe(2001);
			expect(res1A.mtime.getFullYear()).toBe(2001);
			if (supportsExecutable) {
				expect(isUserExec(res1A.mode)).toBeFalse();
			}

			const res1B = await st('resources1/d/b.txt');
			expect(res1B.atime.getFullYear()).toBe(2001);
			expect(res1B.mtime.getFullYear()).toBe(2001);
			if (supportsExecutable) {
				expect(isUserExec(res1B.mode)).toBeTrue();
			}

			if (supportsSymlinks) {
				const res1L1 = await st('resources1/l1.txt');
				const res1L2 = await st('resources1/l2.txt');

				if (supportsSymlinkAttrs) {
					expect(res1L1.atime.getFullYear()).toBe(2001);
					expect(res1L1.mtime.getFullYear()).toBe(2001);
					if (supportsExecutable) {
						expect(isUserExec(res1L1.mode)).toBeTrue();
					}

					expect(res1L2.atime.getFullYear()).toBe(2001);
					expect(res1L2.mtime.getFullYear()).toBe(2001);
					if (supportsExecutable) {
						expect(isUserExec(res1L2.mode)).toBeFalse();
					}
				}
			}

			const res2 = await st('resources2');
			expect(res2.atime.getFullYear()).not.toBe(2002);
			expect(res2.mtime.getFullYear()).not.toBe(2002);

			const res2A = await st('resources2/a.txt');
			expect(res2A.atime.getFullYear()).toBe(2002);
			expect(res2A.mtime.getFullYear()).toBe(2002);
			if (supportsExecutable) {
				expect(isUserExec(res2A.mode)).toBeTrue();
			}

			const res2B = await st('resources2/d/b.txt');
			expect(res2B.atime.getFullYear()).toBe(2002);
			expect(res2B.mtime.getFullYear()).toBe(2002);
			if (supportsExecutable) {
				expect(isUserExec(res2B.mode)).toBeFalse();
			}

			if (supportsSymlinks) {
				const res1L1 = await st('resources2/l1.txt');
				const res1L2 = await st('resources2/l2.txt');

				if (supportsSymlinkAttrs) {
					expect(res1L1.atime.getFullYear()).toBe(2002);
					expect(res1L1.mtime.getFullYear()).toBe(2002);
					if (supportsExecutable) {
						expect(isUserExec(res1L1.mode)).toBeTrue();
					}

					expect(res1L2.atime.getFullYear()).toBe(2002);
					expect(res1L2.mtime.getFullYear()).toBe(2002);
					if (supportsExecutable) {
						expect(isUserExec(res1L2.mode)).toBeFalse();
					}
				}
			}
		});
	});
});

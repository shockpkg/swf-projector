import {describe, it} from 'node:test';
import {notStrictEqual, strictEqual} from 'node:assert';
import {
	chmod,
	lstat,
	mkdir,
	rm,
	symlink,
	utimes,
	writeFile
} from 'node:fs/promises';
import {join as pathJoin, dirname} from 'node:path';

import {fsLchmod, fsLutimes} from '@shockpkg/archive-files';

import {BundleDummy, cleanBundlesDir} from './bundle.spec';
import {fixtureFile} from './util.spec';

const getDir = async (d: string) => cleanBundlesDir('dummy', d);

const supportsExecutable = !process.platform.startsWith('win');
const supportsSymlinks = !process.platform.startsWith('win');
const supportsSymlinkAttrs = process.platform.startsWith('darwin');

// eslint-disable-next-line no-bitwise
const isUserExec = (mode: number) => !!(mode & 0b001000000);

void describe('bundle', () => {
	void describe('BundleDummy', () => {
		void it('simple', async () => {
			const dir = await getDir('simple');
			const dest = pathJoin(dir, 'application.exe');

			const b = new BundleDummy(dest);
			b.projector.player = fixtureFile('dummy.exe');
			await b.withFile(fixtureFile('swf3.swf'));
		});

		void it('resources', async () => {
			const dir = await getDir('resources');
			const dest = pathJoin(dir, 'application.exe');

			const dateA = new Date('2001-06-15');
			const dateB = new Date('2002-06-15');

			const resources = pathJoin(dir, 'resources');
			const resourcesA = pathJoin(resources, 'a.txt');
			const resourcesB = pathJoin(resources, 'd/b.txt');
			const resourcesL1 = pathJoin(resources, 'l1.txt');
			const resourcesL2 = pathJoin(resources, 'l2.txt');

			await mkdir(resources, {recursive: true});

			await mkdir(dirname(resourcesA), {recursive: true});
			await writeFile(resourcesA, 'alpha');
			await chmod(resourcesA, 0o666);
			await utimes(resourcesA, dateA, dateA);

			await mkdir(dirname(resourcesB), {recursive: true});
			await writeFile(resourcesB, 'beta');
			await chmod(resourcesB, 0o777);
			await utimes(resourcesB, dateA, dateA);

			if (supportsSymlinks) {
				await symlink('a.txt', resourcesL1);
				await symlink('a.txt', resourcesL2);

				if (supportsSymlinkAttrs) {
					await fsLchmod(resourcesL1, 0o777);
					await fsLutimes(resourcesL1, dateA, dateA);

					await fsLchmod(resourcesL2, 0o666);
					await fsLutimes(resourcesL2, dateA, dateA);
				}
			}

			await utimes(resources, dateA, dateA);

			const b = new BundleDummy(dest);
			b.projector.player = fixtureFile('dummy.exe');
			await b.withFile(fixtureFile('swf3.swf'), async p => {
				await p.copyResource('resources0', resources);

				await p.copyResource('resources1', resources, {
					atimeCopy: true,
					mtimeCopy: true,
					executableCopy: true
				});

				await p.copyResource('resources2/a.txt', resourcesA, {
					atime: dateB,
					mtime: dateB,
					executable: true
				});
				await p.copyResource('resources2/d/b.txt', resourcesB, {
					atime: dateB,
					mtime: dateB,
					executable: false
				});

				if (supportsSymlinks) {
					await p.copyResource('resources2/l1.txt', resourcesL1, {
						atime: dateB,
						mtime: dateB,
						executable: true
					});
					await p.copyResource('resources2/l2.txt', resourcesL2, {
						atime: dateB,
						mtime: dateB,
						executable: false
					});
				}
			});

			await rm(resources, {recursive: true, force: true});

			const st = async (path: string) => lstat(b.resourcePath(path));

			const res0 = await st('resources0');
			notStrictEqual(res0.atime.getFullYear(), 2001);
			notStrictEqual(res0.mtime.getFullYear(), 2001);

			const res0A = await st('resources0/a.txt');
			notStrictEqual(res0A.mtime.getFullYear(), 2001);
			if (supportsExecutable) {
				strictEqual(isUserExec(res0A.mode), false);
			}

			const res0B = await st('resources0/d/b.txt');
			notStrictEqual(res0B.mtime.getFullYear(), 2001);
			if (supportsExecutable) {
				strictEqual(isUserExec(res0B.mode), false);
			}

			if (supportsSymlinks) {
				const res0L1 = await st('resources0/l1.txt');
				const res0L2 = await st('resources0/l2.txt');

				if (supportsSymlinkAttrs) {
					notStrictEqual(res0L1.mtime.getFullYear(), 2001);
					notStrictEqual(res0L2.mtime.getFullYear(), 2001);
				}
			}

			const res1 = await st('resources1');
			strictEqual(res1.mtime.getFullYear(), 2001);

			const res1A = await st('resources1/a.txt');
			strictEqual(res1A.mtime.getFullYear(), 2001);
			if (supportsExecutable) {
				strictEqual(isUserExec(res1A.mode), false);
			}

			const res1B = await st('resources1/d/b.txt');
			strictEqual(res1B.mtime.getFullYear(), 2001);
			if (supportsExecutable) {
				strictEqual(isUserExec(res1B.mode), true);
			}

			if (supportsSymlinks) {
				const res1L1 = await st('resources1/l1.txt');
				const res1L2 = await st('resources1/l2.txt');

				if (supportsSymlinkAttrs) {
					strictEqual(res1L1.mtime.getFullYear(), 2001);
					if (supportsExecutable) {
						strictEqual(isUserExec(res1L1.mode), true);
					}

					strictEqual(res1L2.mtime.getFullYear(), 2001);
					if (supportsExecutable) {
						strictEqual(isUserExec(res1L2.mode), false);
					}
				}
			}

			const res2 = await st('resources2');
			notStrictEqual(res2.mtime.getFullYear(), 2002);

			const res2A = await st('resources2/a.txt');
			strictEqual(res2A.mtime.getFullYear(), 2002);
			if (supportsExecutable) {
				strictEqual(isUserExec(res2A.mode), true);
			}

			const res2B = await st('resources2/d/b.txt');
			strictEqual(res2B.mtime.getFullYear(), 2002);
			if (supportsExecutable) {
				strictEqual(isUserExec(res2B.mode), false);
			}

			if (supportsSymlinks) {
				const res1L1 = await st('resources2/l1.txt');
				const res1L2 = await st('resources2/l2.txt');

				if (supportsSymlinkAttrs) {
					strictEqual(res1L1.mtime.getFullYear(), 2002);
					if (supportsExecutable) {
						strictEqual(isUserExec(res1L1.mode), true);
					}

					strictEqual(res1L2.mtime.getFullYear(), 2002);
					if (supportsExecutable) {
						strictEqual(isUserExec(res1L2.mode), false);
					}
				}
			}
		});

		void it('merge', async () => {
			const dir = await getDir('merge');
			const dest = pathJoin(dir, 'application.exe');

			const resources = pathJoin(dir, 'resources');
			const resourcesA = pathJoin(resources, 'd/a.txt');

			await mkdir(resources, {recursive: true});

			await mkdir(dirname(resourcesA), {recursive: true});
			await writeFile(resourcesA, 'alpha');

			const b = new BundleDummy(dest);
			b.projector.player = fixtureFile('dummy.exe');
			await b.withFile(fixtureFile('swf3.swf'), async p => {
				await p.createResourceFile('d/b.txt', 'beta');

				// Merge contents at root of resources.
				await p.copyResource('.', resources, {
					merge: true
				});
			});

			await rm(resources, {recursive: true, force: true});

			const st = async (path: string) => lstat(b.resourcePath(path));

			strictEqual((await st('d/a.txt')).isFile(), true);
			strictEqual((await st('d/b.txt')).isFile(), true);
		});
	});
});

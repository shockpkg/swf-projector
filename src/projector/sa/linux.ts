import {mkdir, open, stat, writeFile} from 'node:fs/promises';
import {basename, dirname} from 'node:path';

import {
	ArchiveDir,
	Entry,
	PathType,
	createArchiveByFileExtensionOrThrow
} from '@shockpkg/archive-files';

import {linuxProjectorPatch} from '../../util/linux.ts';
import {EM_X86_64} from '../../util/internal/linux/elf.ts';
import {IFilePatch, ProjectorSa} from '../sa.ts';
import {concat} from '../../util/internal/data.ts';

/**
 * ProjectorSaLinux object.
 */
export class ProjectorSaLinux extends ProjectorSa {
	/**
	 * Attempt to patch the window title with a custom title.
	 * Set to a string to automatically patch the binary if possible.
	 */
	public patchWindowTitle: string | null = null;

	/**
	 * Attempt to patch out application menu.
	 * Set to true to automatically patch the code if possible.
	 */
	public patchMenuRemove = false;

	/**
	 * Attempt to patch the projector path reading code.
	 * Necessary to work around broken projector path resolving code.
	 * Set to true to automatically patch the code if possible.
	 */
	public patchProjectorPath = false;

	/**
	 * Attempt to patch the broken 64-bit projector offset reading code.
	 * Necessary to work around broken projector logic in standalone players.
	 * Set to true to automatically patch the code if possible.
	 */
	public patchProjectorOffset = false;

	/**
	 * ProjectorSaLinux constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * @inheritdoc
	 */
	public get extension() {
		return '';
	}

	/**
	 * Get projector archive names, case insensitive.
	 *
	 * @returns List of names known to be used in projectors.
	 */
	public getProjectorArchiveNames() {
		return ['flashplayer', 'flashplayerdebugger', 'gflashplayer'];
	}

	/**
	 * @inheritdoc
	 */
	protected async _writePlayer(player: string) {
		const {path} = this;
		let isElf = false;
		const st = await stat(player);
		const isDir = st.isDirectory();
		if (!isDir && st.size >= 4) {
			const d = new ArrayBuffer(4);
			const f = await open(player, 'r');
			try {
				await f.read(new Uint8Array(d), 0, 4, 0);
			} finally {
				await f.close();
			}
			isElf = new DataView(d).getUint32(0, false) === 0x7f454c46;
		}

		let archive;
		let isPlayer: (path: string, mode: number | null) => boolean;
		if (isElf) {
			const name = basename(player);
			archive = new ArchiveDir(dirname(player));
			archive.subpaths = [name];
			// eslint-disable-next-line jsdoc/require-jsdoc
			isPlayer = (path: string, mode: number | null) => path === name;
		} else {
			archive = isDir
				? new ArchiveDir(player)
				: createArchiveByFileExtensionOrThrow(player, {
						nobrowse: this.nobrowse
					});
			const names = new Set<string>();
			for (const n of this.getProjectorArchiveNames()) {
				names.add(n.toLowerCase());
			}
			// eslint-disable-next-line jsdoc/require-jsdoc
			isPlayer = (path: string, mode: number | null) =>
				// The file should be user executable, if mode is available.
				// eslint-disable-next-line no-bitwise
				(mode === null || !!(mode & 0b001000000)) &&
				names.has(path.slice(path.lastIndexOf('/') + 1).toLowerCase());
		}

		const patches = await this._getPatches();

		/**
		 * Extract entry, and also apply patches if any.
		 *
		 * @param entry Archive entry.
		 * @param dest Output path.
		 */
		const extract = async (entry: Entry, dest: string) => {
			if (entry.type === PathType.FILE) {
				let data: Uint8Array | null = null;
				for (const patch of patches) {
					// eslint-disable-next-line unicorn/prefer-regexp-test
					if (patch.match(entry.volumePath)) {
						if (!data) {
							// eslint-disable-next-line no-await-in-loop
							const d = await entry.read();
							if (!d) {
								throw new Error(
									`Failed to read: ${entry.volumePath}`
								);
							}
							data = new Uint8Array(
								d.buffer,
								d.byteOffset,
								d.byteLength
							);
						}
						// eslint-disable-next-line no-await-in-loop
						data = await patch.modify(data);
					}
				}

				if (data) {
					await mkdir(dirname(dest), {recursive: true});
					await writeFile(dest, data);
					await entry.setAttributes(dest, null, {
						ignoreTimes: true
					});
					return;
				}
			}

			await entry.extract(dest);
		};

		let playerPath = '';
		await archive.read(async entry => {
			const {volumePath, type, mode} = entry;

			// Only looking for regular files, no resource forks.
			if (type !== PathType.FILE) {
				return true;
			}

			// Ignore files that are not the player file.
			if (!isPlayer(volumePath, mode)) {
				return true;
			}

			if (playerPath) {
				throw new Error(`Found multiple players in: ${player}`);
			}
			playerPath = volumePath;

			await extract(entry, path);
			return true;
		});

		if (!playerPath) {
			throw new Error(`Failed to locate player in: ${player}`);
		}

		await Promise.all(patches.map(async p => p.after()));
	}

	/**
	 * Get patches to apply.
	 *
	 * @returns Patches list.
	 */
	protected async _getPatches() {
		return (
			await Promise.all([this._getPatchBinary(), this._getPatchMovie()])
		).filter(Boolean) as IFilePatch[];
	}

	/**
	 * Get patch for binary.
	 *
	 * @returns Patch spec.
	 */
	protected async _getPatchBinary() {
		const {
			patchWindowTitle,
			patchMenuRemove,
			patchProjectorPath,
			patchProjectorOffset
		} = this;
		if (
			!(
				patchWindowTitle !== null ||
				patchMenuRemove ||
				patchProjectorPath ||
				patchProjectorOffset
			)
		) {
			return null;
		}

		const patch: IFilePatch = {
			/**
			 * @inheritdoc
			 */
			match: (file: string) => true,

			/**
			 * @inheritdoc
			 */
			modify: (data: Uint8Array) =>
				linuxProjectorPatch(data, {
					patchWindowTitle,
					patchMenuRemove,
					patchProjectorPath,
					patchProjectorOffset
				}),

			/**
			 * @inheritdoc
			 */
			after: () => {}
		};
		return patch;
	}

	/**
	 * Get patch for movie.
	 *
	 * @returns Patch spec.
	 */
	protected async _getPatchMovie() {
		const movieData = await this.getMovieData();
		if (!movieData) {
			return null;
		}

		const patch: IFilePatch = {
			/**
			 * @inheritdoc
			 */
			match: (file: string) => true,

			/**
			 * @inheritdoc
			 */
			modify: (data: Uint8Array) => {
				const v = new DataView(
					data.buffer,
					data.byteOffset,
					data.byteLength
				);
				return concat([
					data,
					this._encodeMovieData(
						movieData,
						v.getUint16(18, true) === EM_X86_64 ? 'lid' : 'smd'
					)
				]);
			},

			/**
			 * @inheritdoc
			 */
			after: () => {}
		};
		return patch;
	}
}

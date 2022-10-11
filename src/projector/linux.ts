import {open, readFile, stat, writeFile} from 'fs/promises';
import {basename, dirname} from 'path';

import {ArchiveDir, PathType} from '@shockpkg/archive-files';

import {Projector} from '../projector';
import {linuxProjectorPatch} from '../util/linux';
import {EM_X86_64} from '../util/internal/linux/elf';

/**
 * ProjectorLinux object.
 */
export class ProjectorLinux extends Projector {
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
	 * Supports projector versions 9+ (unnecessary for version 6).
	 */
	public patchProjectorPath = false;

	/**
	 * Attempt to patch the broken 64-bit projector offset reading code.
	 * Necessary to work around broken projector logic in standalone players.
	 * Set to true to automatically patch the code if possible.
	 */
	public patchProjectorOffset = false;

	/**
	 * ProjectorLinux constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * Projector file extension.
	 *
	 * @returns File extension.
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
	 * Write the projector player.
	 *
	 * @param player Player path.
	 */
	protected async _writePlayer(player: string) {
		const {path} = this;
		let isElf = false;
		const st = await stat(player);
		if (!st.isDirectory() && st.size >= 4) {
			const d = Buffer.alloc(4);
			const f = await open(player, 'r');
			try {
				await f.read(d, 0, 4, 0);
			} finally {
				await f.close();
			}
			isElf = d.readUInt32BE() === 0x7f454c46;
		}

		let archive;
		let isPlayer: (path: string, mode: number | null) => boolean;
		if (isElf) {
			const name = basename(player);
			archive = await this._openArchive(dirname(player));
			(archive as ArchiveDir).subpaths = [name];
			// eslint-disable-next-line jsdoc/require-jsdoc
			isPlayer = (path: string, mode: number | null) => path === name;
		} else {
			archive = await this._openArchive(player);
			const names = new Set<string>();
			for (const n of this.getProjectorArchiveNames()) {
				names.add(n.toLowerCase());
			}
			// eslint-disable-next-line jsdoc/require-jsdoc
			isPlayer = (path: string, mode: number | null) =>
				// The file should be user executable, if mode is available.
				// eslint-disable-next-line no-bitwise
				(mode === null || !!(mode & 0b001000000)) &&
				names.has(
					path.substring(path.lastIndexOf('/') + 1).toLowerCase()
				);
		}

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

			await entry.extract(path);
			return true;
		});

		if (!playerPath) {
			throw new Error(`Failed to locate player in: ${player}`);
		}
	}

	/**
	 * @inheritDoc
	 */
	protected async _modifyPlayer(movieData: Readonly<Buffer> | null) {
		const {
			path,
			patchWindowTitle,
			patchMenuRemove,
			patchProjectorPath,
			patchProjectorOffset
		} = this;

		let data = null;

		if (
			patchWindowTitle !== null ||
			patchMenuRemove ||
			patchProjectorPath ||
			patchProjectorOffset
		) {
			data = data || (await readFile(path));
			data = linuxProjectorPatch(data, {
				patchWindowTitle,
				patchMenuRemove,
				patchProjectorPath,
				patchProjectorOffset
			});
		}

		if (movieData) {
			data = data || (await readFile(path));
			data = Buffer.concat([
				data,
				this._encodeMovieData(
					movieData,
					data.readUint16LE(18) === EM_X86_64 ? 'lid' : 'smd'
				)
			]);
		}

		if (data) {
			await writeFile(path, data);
		}
	}
}

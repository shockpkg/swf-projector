import {copyFile, mkdir, readFile, stat, writeFile} from 'fs/promises';
import {dirname} from 'path';

import {
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';

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
		// Try reading as archive, else assume Linux binary if not a directory.
		try {
			await this._writePlayerArchive(player);
		} catch (err) {
			if (
				!(await stat(player)).isDirectory() &&
				err &&
				`${(err as {message: string}).message}`.startsWith(
					'Archive file type unknown: '
				)
			) {
				await this._writePlayerFile(player);
			} else {
				throw err;
			}
		}
	}

	/**
	 * Write the projector player, from file.
	 *
	 * @param player Player path.
	 */
	protected async _writePlayerFile(player: string) {
		const st = await stat(player);
		if (!st.isFile()) {
			throw new Error(`Path not a file: ${player}`);
		}

		const {path} = this;
		await mkdir(dirname(path), {recursive: true});
		await copyFile(player, path);
		await fsChmod(path, modePermissionBits(st.mode));
		await fsUtimes(path, st.atime, st.mtime);
	}

	/**
	 * Write the projector player, from archive.
	 *
	 * @param player Player path.
	 */
	protected async _writePlayerArchive(player: string) {
		let playerPath = '';
		const playerOut = this.path;

		const projectorArchiveNames = new Set<string>();
		for (const n of this.getProjectorArchiveNames()) {
			projectorArchiveNames.add(n.toLowerCase());
		}

		const archive = await this._openArchive(player);
		await archive.read(async entry => {
			// Only looking for regular files, no resource forks.
			if (entry.type !== PathType.FILE) {
				return;
			}
			const {mode, path} = entry;

			// The file should be user executable, assuming mode is available.
			// eslint-disable-next-line no-bitwise
			const userExec = mode === null ? null : !!(mode & 0b001000000);
			if (userExec === false) {
				return;
			}
			const name = path.substring(path.lastIndexOf('/') + 1);
			const nameLower = name.toLowerCase();

			if (!projectorArchiveNames.has(nameLower)) {
				return;
			}

			if (playerPath) {
				throw new Error(`Found multiple players in archive: ${player}`);
			}
			playerPath = path;

			await entry.extract(playerOut);
		});

		if (!playerPath) {
			throw new Error(`Failed to locate player in archive: ${player}`);
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

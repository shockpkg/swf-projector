import {
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';
import fse from 'fs-extra';

import {
	linuxPatchWindowTitle,
	linuxPatchMenuRemoveData,
	linuxPatchProjectorPathData
} from '../utils/linux';
import {
	Projector
} from '../projector';

/**
 * ProjectorLinux constructor.
 *
 * @param path Output path.
 */
export class ProjectorLinux extends Projector {
	/**
	 * Attempt to patch the window title with a custom title.
	 * Set to a non-empty string to automatically patch the binary if possible.
	 * Size limit depends on the size of the string being replaced.
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
		return [
			'flashplayer',
			'flashplayerdebugger',
			'gflashplayer'
		];
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
		}
		catch (err) {
			if (
				!(await fse.stat(player)).isDirectory() &&
				err &&
				`${err.message}`.startsWith('Archive file type unknown: ')
			) {
				await this._writePlayerFile(player);
			}
			else {
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
		const stat = await fse.stat(player);
		if (!stat.isFile()) {
			throw new Error(`Path not a file: ${player}`);
		}

		const {path} = this;
		await fse.copyFile(player, path);
		await fsChmod(path, modePermissionBits(stat.mode));
		await fsUtimes(path, stat.atime, stat.mtime);
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

		const archive = await this.openAsArchive(player);
		await archive.read(async entry => {
			// Only looking for regular files, no resource forks.
			if (entry.type !== PathType.FILE) {
				return;
			}
			const {
				mode,
				path
			} = entry;

			// The file should be user executable, assuming mode is available.
			// eslint-disable-next-line no-bitwise
			const userExec = mode === null ? null : !!(mode & 0b001000000);
			if (userExec === false) {
				return;
			}
			const name = path.substr(path.lastIndexOf('/') + 1);
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
	 * Modify the projector player.
	 */
	protected async _modifyPlayer() {
		const {
			patchWindowTitle,
			patchMenuRemove,
			patchProjectorPath
		} = this;

		// Skip if no patching was requested.
		if (!(
			patchWindowTitle ||
			patchMenuRemove ||
			patchProjectorPath
		)) {
			return;
		}

		// Read the projector file.
		const {path} = this;
		let data = await fse.readFile(path);

		// Attempt to patch the projector data.
		if (patchWindowTitle) {
			data = linuxPatchWindowTitle(data, patchWindowTitle);
		}
		if (patchMenuRemove) {
			data = linuxPatchMenuRemoveData(data);
		}
		if (patchProjectorPath) {
			data = linuxPatchProjectorPathData(data);
		}

		// Write out patched data.
		await fse.writeFile(path, data);
	}

	/**
	 * Write out the projector movie file.
	 *
	 * @param movieData Movie data or null.
	 */
	protected async _writeMovie(movieData: Readonly<Buffer> | null) {
		if (!movieData) {
			return;
		}

		await this._appendMovieData(this.path, movieData, 'smd');
	}
}

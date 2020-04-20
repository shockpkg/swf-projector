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
	 * Set to a non-empty string to automaticly patch the binary if possible.
	 * Size limit depends on the size of the string being replaced.
	 */
	public patchWindowTitle: string | null = null;

	/**
	 * Attempt to patch out application menu.
	 * Set to true to automaticly patch the code if possible.
	 *
	 * @default false
	 */
	public patchMenuRemove = false;

	/**
	 * Attempt to patch the projector path reading code.
	 * Necessary to work around broken projector path resolving code.
	 * Set to true to automaticly patch the code if possible.
	 * Supports projector versions 9+ (unnecessary for version 6).
	 *
	 * @default false
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
	public get projectorExtension() {
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
	 */
	protected async _writePlayer() {
		const player = this.getPlayerPath();
		const stat = await fse.stat(player);
		const isDirectory = stat.isDirectory();

		// Try reading as archive, fall back on assuming Linux binary.
		try {
			await this._writePlayerArchive();
		}
		catch (err) {
			if (
				!isDirectory &&
				err &&
				`${err.message}`.startsWith('Archive file type unknown: ')
			) {
				await this._writePlayerFile();
			}
			else {
				throw err;
			}
		}
	}

	/**
	 * Write the projector player, from file.
	 */
	protected async _writePlayerFile() {
		const player = this.getPlayerPath();
		const stat = await fse.stat(player);
		if (!stat.isFile()) {
			throw new Error(`Path is not file: ${player}`);
		}

		const {path} = this;
		await fse.copyFile(player, path);
		await fsChmod(path, modePermissionBits(stat.mode));
		await fsUtimes(path, stat.atime, stat.mtime);
	}

	/**
	 * Write the projector player, from archive.
	 */
	protected async _writePlayerArchive() {
		let playerPath = '';

		const projectorArchiveNames = new Set();
		for (const n of this.getProjectorArchiveNames()) {
			projectorArchiveNames.add(n);
		}

		const player = this.getPlayerPath();
		const playerOut = this.path;

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
	 */
	protected async _writeMovie() {
		const data = await this.getMovieData();
		if (!data) {
			return;
		}

		await this._appendMovieData(this.path, data, 'smd');
	}
}

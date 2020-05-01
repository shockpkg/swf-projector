import {dirname} from 'path';

import {
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';
import fse from 'fs-extra';

import {
	Projector
} from '../projector';

/**
 * ProjectorLinux constructor.
 *
 * @param path Output path.
 */
export abstract class ProjectorLinux extends Projector {
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
		await fse.ensureDir(dirname(path));
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
}

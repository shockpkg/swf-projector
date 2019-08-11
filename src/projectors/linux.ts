import {
	join as pathJoin
} from 'path';

import {
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';
import fse from 'fs-extra';

import {
	IProjectorOptions,
	Projector
} from '../projector';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IProjectorLinuxOptions extends IProjectorOptions {
}

/**
 * ProjectorLinux constructor.
 *
 * @param options Options object.
 */
export class ProjectorLinux extends Projector {
	constructor(options: IProjectorLinuxOptions = {}) {
		super(options);
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
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writePlayer(path: string, name: string) {
		const player = this.getPlayerPath();
		const stat = await fse.stat(player);
		const isDirectory = stat.isDirectory();

		// Try reading as archive, fall back on assuming Linux binary.
		try {
			await this._writePlayerArchive(path, name);
		}
		catch (err) {
			if (
				!isDirectory &&
				err &&
				`${err.message}`.startsWith('Archive file type unknown: ')
			) {
				await this._writePlayerFile(path, name);
			}
			else {
				throw err;
			}
		}
	}

	/**
	 * Write the projector player, from file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writePlayerFile(path: string, name: string) {
		const player = this.getPlayerPath();
		const stat = await fse.stat(player);
		if (!stat.isFile()) {
			throw new Error(`Path is not file: ${player}`);
		}

		const playerOut = pathJoin(path, name);
		await fse.copyFile(player, playerOut);
		await fsChmod(playerOut, modePermissionBits(stat.mode));
		await fsUtimes(playerOut, stat.atime, stat.mtime);
	}

	/**
	 * Write the projector player, from archive.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writePlayerArchive(path: string, name: string) {
		let playerPath = '';

		const projectorArchiveNames = new Set();
		for (const n of this.getProjectorArchiveNames()) {
			projectorArchiveNames.add(n);
		}

		const player = this.getPlayerPath();
		const playerOut = pathJoin(path, name);

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
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _modifyPlayer(path: string, name: string) {
		// Nothing to do here.
	}

	/**
	 * Write out the projector movie file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writeMovie(path: string, name: string) {
		const data = await this.getMovieData();
		if (!data) {
			return;
		}

		await this._appendMovieData(pathJoin(path, name), data, 'smd');
	}
}

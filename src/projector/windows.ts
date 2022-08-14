import {copyFile, mkdir, stat} from 'fs/promises';
import {dirname} from 'path';

import {
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';

import {Projector} from '../projector';

/**
 * ProjectorWindows object.
 */
export abstract class ProjectorWindows extends Projector {
	/**
	 * ProjectorWindows constructor.
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
		return '.exe';
	}

	/**
	 * Write the projector player.
	 *
	 * @param player Player path.
	 */
	protected async _writePlayer(player: string) {
		if (
			player.toLowerCase().endsWith(this.extension.toLowerCase()) &&
			(await stat(player)).isFile()
		) {
			await this._writePlayerFile(player);
		} else {
			await this._writePlayerArchive(player);
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
		const extensionLower = this.extension.toLowerCase();
		let playerPath = '';
		const playerOut = this.path;

		const archive = await this.openAsArchive(player);
		await archive.read(async entry => {
			// Only looking for regular files, no resource forks.
			if (entry.type !== PathType.FILE) {
				return;
			}
			const {path} = entry;

			if (!path.toLowerCase().endsWith(extensionLower)) {
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

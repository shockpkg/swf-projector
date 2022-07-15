import {dirname} from 'path';

import fse from 'fs-extra';
import {
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';

import {peResourceReplace} from '../util/windows';
import {Projector} from '../projector';

/**
 * ProjectorWindows object.
 */
export abstract class ProjectorWindows extends Projector {
	/**
	 * Icon file.
	 */
	public iconFile: string | null = null;

	/**
	 * Icon data.
	 */
	public iconData: Readonly<Buffer> | null = null;

	/**
	 * Version strings.
	 */
	public versionStrings: Readonly<{[key: string]: string}> | null = null;

	/**
	 * Remove the code signature.
	 */
	public removeCodeSignature = false;

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
	 * Get icon data if any specified, from data or file.
	 *
	 * @returns Icon data or null.
	 */
	public async getIconData() {
		const {iconData, iconFile} = this;
		return iconData || (iconFile ? fse.readFile(iconFile) : null);
	}

	/**
	 * Write the projector player.
	 *
	 * @param player Player path.
	 */
	protected async _writePlayer(player: string) {
		if (
			player.toLowerCase().endsWith(this.extension.toLowerCase()) &&
			(await fse.stat(player)).isFile()
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

	/**
	 * Modify the projector player.
	 */
	protected async _modifyPlayer() {
		const iconData = await this.getIconData();
		const {versionStrings, removeCodeSignature} = this;
		if (!(iconData || versionStrings || removeCodeSignature)) {
			return;
		}

		await peResourceReplace(this.path, {
			iconData,
			versionStrings,
			removeSignature: removeCodeSignature
		});
	}
}

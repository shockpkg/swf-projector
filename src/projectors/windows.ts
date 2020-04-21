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
import {
	peResourceReplace
} from '../utils/windows';

/**
 * ProjectorWindows constructor.
 *
 * @param path Output path.
 */
export class ProjectorWindows extends Projector {
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

	constructor(path: string) {
		super(path);
	}

	/**
	 * Projector file extension.
	 *
	 * @returns File extension.
	 */
	public get projectorExtension() {
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
	 */
	protected async _writePlayer() {
		const player = this.getPlayerPath();
		if (
			player.toLowerCase().endsWith(
				this.projectorExtension.toLowerCase()
			) &&
			(await fse.stat(player)).isFile()
		) {
			await this._writePlayerFile();
		}
		else {
			await this._writePlayerArchive();
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
		const projectorExtensionLower = this.projectorExtension.toLowerCase();
		let playerPath = '';

		const player = this.getPlayerPath();
		const playerOut = this.path;

		const archive = await this.openAsArchive(player);
		await archive.read(async entry => {
			// Only looking for regular files, no resource forks.
			if (entry.type !== PathType.FILE) {
				return;
			}
			const {path} = entry;

			if (!path.toLowerCase().endsWith(projectorExtensionLower)) {
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
		const {
			versionStrings,
			removeCodeSignature
		} = this;
		if (!(
			iconData ||
			versionStrings ||
			removeCodeSignature
		)) {
			return;
		}

		await peResourceReplace(this.path, {
			iconData,
			versionStrings,
			removeSignature: removeCodeSignature
		});
	}

	/**
	 * Write out the projector movie file.
	 */
	protected async _writeMovie() {
		const data = await this.getMovieData();
		if (!data) {
			return;
		}

		await this._appendMovieData(this.path, data, 'dms');
	}
}

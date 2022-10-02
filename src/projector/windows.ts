import {copyFile, mkdir, stat, readFile, writeFile} from 'fs/promises';
import {dirname} from 'path';

import {
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';

import {Projector} from '../projector';
import {windowsProjectorPatch} from '../util/windows';

/**
 * ProjectorWindows object.
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

	/**
	 * Attempt to patch the window title with a custom title.
	 * Set to string to automatically patch the binary if possible.
	 */
	public patchWindowTitle: string | null = null;

	/**
	 * Disable the out-of-date check introduced in version 30.
	 * Important since version 35 where there are 90 and 180 day defaults.
	 */
	public patchOutOfDateDisable = false;

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
		return iconData || (iconFile ? readFile(iconFile) : null);
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

	/**
	 * @inheritDoc
	 */
	protected async _modifyPlayer(movieData: Readonly<Buffer> | null) {
		const {
			path,
			versionStrings,
			removeCodeSignature,
			patchWindowTitle,
			patchOutOfDateDisable
		} = this;
		const iconData = await this.getIconData();

		let data = null;

		if (
			iconData ||
			versionStrings ||
			removeCodeSignature ||
			patchWindowTitle !== null ||
			patchOutOfDateDisable
		) {
			data = data || (await readFile(path));
			data = windowsProjectorPatch(data, {
				iconData,
				versionStrings,
				removeCodeSignature,
				patchWindowTitle,
				patchOutOfDateDisable
			});
		}

		if (movieData) {
			data = data || (await readFile(path));
			data = Buffer.concat([
				data,
				this._encodeMovieData(movieData, 'dms')
			]);
		}

		if (data) {
			await writeFile(path, data);
		}
	}
}

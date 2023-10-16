import {stat, readFile, writeFile} from 'node:fs/promises';
import {basename, dirname} from 'node:path';

import {
	ArchiveDir,
	PathType,
	createArchiveByFileExtensionOrThrow
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
		const {path, extension} = this;
		const extLower = extension.toLowerCase();

		let archive;
		let isPlayer: (path: string) => boolean;
		let st = player.toLowerCase().endsWith(extLower)
			? await stat(player)
			: null;
		if (st?.isFile()) {
			const name = basename(player);
			archive = new ArchiveDir(dirname(player));
			archive.subpaths = [name];
			// eslint-disable-next-line jsdoc/require-jsdoc
			isPlayer = (path: string) => path === name;
		} else {
			st ??= await stat(player);
			archive = st.isDirectory()
				? new ArchiveDir(player)
				: createArchiveByFileExtensionOrThrow(player, {
						nobrowse: this.nobrowse
				  });
			// eslint-disable-next-line jsdoc/require-jsdoc
			isPlayer = (path: string) => path.toLowerCase().endsWith(extLower);
		}

		let playerPath = '';
		await archive.read(async entry => {
			const {volumePath, type} = entry;

			// Only looking for regular files, no resource forks.
			if (type !== PathType.FILE) {
				return true;
			}

			// Ignore files that are not the player file.
			if (!isPlayer(volumePath)) {
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

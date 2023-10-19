import {stat, readFile, writeFile} from 'node:fs/promises';
import {basename, dirname} from 'node:path';

import {
	ArchiveDir,
	PathType,
	createArchiveByFileExtensionOrThrow
} from '@shockpkg/archive-files';

import {windowsProjectorPatch} from '../../util/windows';
import {ProjectorSa} from '../sa';
import {concat} from '../../util/internal/data';

/**
 * ProjectorSaWindows object.
 */
export class ProjectorSaWindows extends ProjectorSa {
	/**
	 * Icon data.
	 */
	public iconData:
		| Readonly<Uint8Array>
		| (() => Readonly<Uint8Array>)
		| (() => Promise<Readonly<Uint8Array>>)
		| null = null;

	/**
	 * Icon file.
	 */
	public iconFile: string | null = null;

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
	 * ProjectorSaWindows constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * @inheritdoc
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
		if (iconData) {
			return typeof iconData === 'function' ? iconData() : iconData;
		}
		if (iconFile) {
			const d = await readFile(iconFile);
			return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
		}
		return null;
	}

	/**
	 * @inheritdoc
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
	protected async _modifyPlayer(movieData: Readonly<Uint8Array> | null) {
		const {
			path,
			versionStrings,
			removeCodeSignature,
			patchWindowTitle,
			patchOutOfDateDisable
		} = this;
		const iconData = await this.getIconData();

		let data: Uint8Array | null = null;

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
			data = concat([data, this._encodeMovieData(movieData, 'dms')]);
		}

		if (data) {
			await writeFile(path, data);
		}
	}
}

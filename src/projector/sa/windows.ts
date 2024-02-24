import {stat, readFile, writeFile, mkdir} from 'node:fs/promises';
import {basename, dirname} from 'node:path';

import {
	ArchiveDir,
	Entry,
	PathType,
	createArchiveByFileExtensionOrThrow
} from '@shockpkg/archive-files';

import {windowsProjectorPatch} from '../../util/windows';
import {IFilePatch, ProjectorSa} from '../sa';
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

		const patches = await this._getPatches();

		/**
		 * Extract entry, and also apply patches if any.
		 *
		 * @param entry Archive entry.
		 * @param dest Output path.
		 */
		const extract = async (entry: Entry, dest: string) => {
			if (entry.type === PathType.FILE) {
				let data: Uint8Array | null = null;
				for (const patch of patches) {
					if (patch.match(entry.volumePath)) {
						if (!data) {
							// eslint-disable-next-line no-await-in-loop
							const d = await entry.read();
							if (!d) {
								throw new Error(
									`Failed to read: ${entry.volumePath}`
								);
							}
							data = new Uint8Array(
								d.buffer,
								d.byteOffset,
								d.byteLength
							);
						}
						// eslint-disable-next-line no-await-in-loop
						data = await patch.modify(data);
					}
				}

				if (data) {
					await mkdir(dirname(dest), {recursive: true});
					await writeFile(dest, data);
					await entry.setAttributes(dest, null, {
						ignoreTimes: true
					});
					return;
				}
			}

			await entry.extract(dest);
		};

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

			await extract(entry, path);
			return true;
		});

		if (!playerPath) {
			throw new Error(`Failed to locate player in: ${player}`);
		}

		await Promise.all(patches.map(async p => p.after()));
	}

	/**
	 * Get patches to apply.
	 *
	 * @returns Patches list.
	 */
	protected async _getPatches() {
		return (
			await Promise.all([this._getPatchBinary(), this._getPatchMovie()])
		).filter(p => p) as IFilePatch[];
	}

	/**
	 * Get patch for binary.
	 *
	 * @returns Patch spec.
	 */
	protected async _getPatchBinary() {
		const {
			versionStrings,
			removeCodeSignature,
			patchWindowTitle,
			patchOutOfDateDisable
		} = this;
		const iconData = await this.getIconData();
		if (
			!(
				iconData ||
				versionStrings ||
				removeCodeSignature ||
				patchWindowTitle !== null ||
				patchOutOfDateDisable
			)
		) {
			return null;
		}

		const patch: IFilePatch = {
			/**
			 * @inheritdoc
			 */
			match: (file: string) => true,

			/**
			 * @inheritdoc
			 */
			modify: (data: Uint8Array) =>
				windowsProjectorPatch(data, {
					iconData,
					versionStrings,
					removeCodeSignature,
					patchWindowTitle,
					patchOutOfDateDisable
				}),

			/**
			 * @inheritdoc
			 */
			after: () => {}
		};
		return patch;
	}

	/**
	 * Get patch for movie.
	 *
	 * @returns Patch spec.
	 */
	// eslint-disable-next-line @typescript-eslint/require-await
	protected async _getPatchMovie() {
		const movieData = await this.getMovieData();
		if (!movieData) {
			return null;
		}

		const patch: IFilePatch = {
			/**
			 * @inheritdoc
			 */
			match: (file: string) => true,

			/**
			 * @inheritdoc
			 */
			modify: (data: Uint8Array) =>
				concat([data, this._encodeMovieData(movieData, 'dms')]),

			/**
			 * @inheritdoc
			 */
			after: () => {}
		};
		return patch;
	}
}

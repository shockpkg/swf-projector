import {mkdir, readFile, rename, stat, writeFile} from 'node:fs/promises';
import {join as pathJoin, basename, dirname} from 'node:path';

import {
	ArchiveDir,
	createArchiveByFileExtensionOrThrow,
	Entry,
	PathType
} from '@shockpkg/archive-files';
import {Plist, ValueDict, ValueString} from '@shockpkg/plist-dom';

import {trimExtension} from '../../util';
import {macProjectorMachoPatch} from '../../util/mac';
import {IFileFilter, IFilePatch, ProjectorSa} from '../sa';

/**
 * ProjectorSaMac object.
 */
export class ProjectorSaMac extends ProjectorSa {
	/**
	 * Binary name, also renames rsrc and icns.
	 */
	public binaryName: string | null = null;

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
	 * Info.plist data.
	 * Currently only supports XML plist.
	 */
	public infoPlistData:
		| string
		| Readonly<Uint8Array>
		| (() => string | Readonly<Uint8Array>)
		| (() => Promise<string | Readonly<Uint8Array>>)
		| null = null;

	/**
	 * Info.plist file.
	 * Currently only supports XML plist.
	 */
	public infoPlistFile: string | null = null;

	/**
	 * PkgInfo data.
	 */
	public pkgInfoData:
		| string
		| Readonly<Uint8Array>
		| (() => Readonly<Uint8Array>)
		| (() => Promise<Readonly<Uint8Array>>)
		| null = null;

	/**
	 * PkgInfo file.
	 */
	public pkgInfoFile: string | null = null;

	/**
	 * Update the bundle name in Info.plist.
	 * Possible values:
	 * - false: Leave untouched.
	 * - true: Output name.
	 * - null: Remove value.
	 * - string: Custom value.
	 */
	public bundleName: boolean | string | null = false;

	/**
	 * Remove the file associations in Info.plist.
	 */
	public removeFileAssociations = false;

	/**
	 * Remove InfoPlist.strings localization files if present.
	 */
	public removeInfoPlistStrings = false;

	/**
	 * Remove the code signature.
	 * Modern projectors are codesigned so that any changes breaks it.
	 * No signature is better than a broken one.
	 */
	public removeCodeSignature = false;

	/**
	 * Attempt to patch the window title with a custom title.
	 * Currently supports versions 11+.
	 */
	public patchWindowTitle: string | null = null;

	/**
	 * ProjectorSaMac constructor.
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
		return '.app';
	}

	/**
	 * Get app icon name, custom.
	 *
	 * @returns File name.
	 */
	public get appIconName() {
		const n = this.binaryName;
		return n ? `${n}.icns` : null;
	}

	/**
	 * Get app rsrc name, custom.
	 *
	 * @returns File name.
	 */
	public get appRsrcName() {
		const n = this.binaryName;
		return n ? `${n}.rsrc` : null;
	}

	/**
	 * Get app movie path.
	 *
	 * @returns File path.
	 */
	public get appPathMovie() {
		return 'Contents/Resources/movie.swf';
	}

	/**
	 * Get app Info.plist path.
	 *
	 * @returns File path.
	 */
	public get appPathInfoPlist() {
		return 'Contents/Info.plist';
	}

	/**
	 * Get app PkgInfo path.
	 *
	 * @returns File path.
	 */
	public get appPathPkgInfo() {
		return 'Contents/PkgInfo';
	}

	/**
	 * Get the movie path.
	 *
	 * @returns Icon path.
	 */
	public get moviePath() {
		return pathJoin(this.path, this.appPathMovie);
	}

	/**
	 * Get the Info.plist path.
	 *
	 * @returns Icon path.
	 */
	public get infoPlistPath() {
		return pathJoin(this.path, this.appPathInfoPlist);
	}

	/**
	 * Get the PkgInfo path.
	 *
	 * @returns Icon path.
	 */
	public get pkgInfoPath() {
		return pathJoin(this.path, this.appPathPkgInfo);
	}

	/**
	 * Get the binary path.
	 *
	 * @param binaryName Binary name.
	 * @returns Binary path.
	 */
	public getBinaryPath(binaryName: string) {
		return pathJoin(this.path, 'Contents/MacOS', binaryName);
	}

	/**
	 * Get the rsrc path.
	 *
	 * @param name The name.
	 * @param addExt Add extension.
	 * @returns Rsrc path.
	 */
	public getRsrcPath(name: string, addExt = false) {
		name += addExt ? '.rsrc' : '';
		return pathJoin(this.path, 'Contents/Resources', name);
	}

	/**
	 * Get the icon path.
	 *
	 * @param iconName Icon name.
	 * @returns Icon path.
	 */
	public getIconPath(iconName: string) {
		return pathJoin(this.path, 'Contents/Resources', iconName);
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
	 * Get Info.plist data if any specified, from data or file.
	 *
	 * @returns Info.plist data or null.
	 */
	public async getInfoPlistData() {
		const {infoPlistData, infoPlistFile} = this;
		if (infoPlistData) {
			switch (typeof infoPlistData) {
				case 'function': {
					const d = await infoPlistData();
					return typeof d === 'string'
						? d
						: new TextDecoder().decode(d);
				}
				case 'string': {
					return infoPlistData;
				}
				default: {
					// Fall through.
				}
			}
			return new TextDecoder().decode(infoPlistData);
		}
		if (infoPlistFile) {
			return readFile(infoPlistFile, 'utf8');
		}
		return null;
	}

	/**
	 * Get PkgInfo data if any specified, from data or file.
	 *
	 * @returns PkgInfo data or null.
	 */
	public async getPkgInfoData() {
		const {pkgInfoData, pkgInfoFile} = this;
		if (pkgInfoData) {
			switch (typeof pkgInfoData) {
				case 'function': {
					return pkgInfoData();
				}
				case 'string': {
					return new TextEncoder().encode(pkgInfoData);
				}
				default: {
					// Fall through.
				}
			}
			return pkgInfoData;
		}
		if (pkgInfoFile) {
			const d = await readFile(pkgInfoFile);
			return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
		}
		return null;
	}

	/**
	 * Get configured bundle name, or null to remove.
	 *
	 * @returns New name or null.
	 */
	public getBundleName() {
		const {bundleName} = this;
		return bundleName === true
			? trimExtension(basename(this.path), this.extension, true)
			: bundleName;
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
		if (st?.isDirectory()) {
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

		const filters = await this._getFilters();
		const patches = await this._getPatches();

		/**
		 * Extract entry, and also apply patches if any.
		 *
		 * @param entry Archive entry.
		 * @param dest Output path.
		 */
		const extract = async (entry: Entry, dest: string) => {
			for (const filter of filters) {
				if (filter.match(entry.volumePath)) {
					return;
				}
			}

			if (entry.type === PathType.FILE) {
				let data: Uint8Array | null = null;
				for (const patch of patches) {
					if (patch.match(entry.volumePath)) {
						// eslint-disable-next-line no-await-in-loop
						data = data || (await entry.read());
						if (!data) {
							throw new Error(
								`Failed to read: ${entry.volumePath}`
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

			// No resource forks expected.
			if (type === PathType.RESOURCE_FORK) {
				return true;
			}

			// Look for the player.
			if (isPlayer(volumePath)) {
				if (playerPath) {
					throw new Error(`Found multiple players in: ${player}`);
				}
				playerPath = volumePath;
			}

			// Check if this is the player.
			if (
				volumePath !== playerPath &&
				!volumePath.startsWith(`${playerPath}/`)
			) {
				return true;
			}

			const dest = path + volumePath.substring(playerPath.length);
			await extract(entry, dest);
			return true;
		});

		if (!playerPath) {
			throw new Error(`Failed to locate player in: ${player}`);
		}

		await Promise.all(patches.map(async p => p.after()));
	}

	/**
	 * @inheritDoc
	 */
	protected async _modifyPlayer(movieData: Readonly<Uint8Array> | null) {
		await this._writeMovie(movieData);
	}

	/**
	 * Write out the projector movie file.
	 *
	 * @param movieData Movie data or null.
	 */
	protected async _writeMovie(movieData: Readonly<Uint8Array> | null) {
		if (!movieData) {
			return;
		}

		await writeFile(this.moviePath, movieData);
	}

	/**
	 * Generate Info.plist XML string, if any.
	 *
	 * @returns XML string or null.
	 */
	protected async _generateInfoPlist() {
		const customPlist = await this.getInfoPlistData();
		const bundleName = this.getBundleName();
		const {binaryName, appIconName, removeFileAssociations} = this;
		if (
			!(
				customPlist !== null ||
				appIconName ||
				binaryName ||
				bundleName !== false ||
				removeFileAssociations
			)
		) {
			return null;
		}

		// Use a custom plist or the existing one.
		const xml = customPlist ?? (await readFile(this.infoPlistPath, 'utf8'));

		const plist = new Plist();
		plist.fromXml(xml);
		const dict = plist.getValue().castAs(ValueDict);

		if (appIconName) {
			dict.set('CFBundleIconFile', new ValueString(appIconName));
		}
		if (binaryName) {
			const key = 'CFBundleExecutable';
			dict.set(key, new ValueString(binaryName));
		}
		if (bundleName !== false) {
			const key = 'CFBundleName';
			if (bundleName === null) {
				dict.delete(key);
			} else {
				dict.set(key, new ValueString(bundleName));
			}
		}
		if (removeFileAssociations) {
			dict.delete('CFBundleDocumentTypes');
		}

		return plist.toXml();
	}

	/**
	 * Get filters to apply.
	 *
	 * @returns Filter list.
	 */
	protected async _getFilters() {
		return (
			await Promise.all([
				this._getFilterInfoPlistStrings(),
				this._getFilterCodeSignature()
			])
		).filter(p => p) as IFileFilter[];
	}

	/**
	 * Get filter for InfoPlist.strings.
	 *
	 * @returns Filter spec.
	 */
	protected _getFilterInfoPlistStrings() {
		const {removeInfoPlistStrings} = this;
		if (!removeInfoPlistStrings) {
			return null;
		}

		const filter: IFileFilter = {
			// eslint-disable-next-line jsdoc/require-jsdoc
			match: (file: string) => /\.lproj\/InfoPlist\.strings$/i.test(file)
		};
		return filter;
	}

	/**
	 * Get filter for code signature paths.
	 *
	 * @returns Filter spec.
	 */
	protected _getFilterCodeSignature() {
		const {removeCodeSignature} = this;
		if (!removeCodeSignature) {
			return null;
		}

		const filter: IFileFilter = {
			// eslint-disable-next-line jsdoc/require-jsdoc
			match: (file: string) =>
				/\/(_CodeSignature|CodeResources)(\/|$)/i.test(file)
		};
		return filter;
	}

	/**
	 * Get patches to apply.
	 *
	 * @returns Patches list.
	 */
	protected async _getPatches() {
		return (
			await Promise.all([
				this._getPatchBinary(),
				// this._getPatchIcon(),
				this._getPatchPkgInfo(),
				this._getPatchInfoPlist()
			])
		).filter(p => p) as IFilePatch[];
	}

	/**
	 * Get patch for PkgInfo.
	 *
	 * @returns Patch spec.
	 */
	protected async _getPatchPkgInfo() {
		const infoData = await this.getPkgInfoData();
		if (!infoData) {
			return null;
		}

		let count = 0;
		const patch: IFilePatch = {
			// eslint-disable-next-line jsdoc/require-jsdoc
			match: (file: string) => /^[^/]+\/Contents\/PkgInfo$/i.test(file),
			// eslint-disable-next-line jsdoc/require-jsdoc
			modify: (data: Uint8Array) => {
				count++;
				return infoData;
			},
			// eslint-disable-next-line jsdoc/require-jsdoc
			after: async () => {
				// Player could omit this file, just write in that case.
				if (!count) {
					const {pkgInfoPath} = this;
					await mkdir(dirname(pkgInfoPath), {recursive: true});
					await writeFile(pkgInfoPath, infoData);
				}
			}
		};
		return patch;
	}

	/**
	 * Get patch for binary.
	 *
	 * @returns Patch spec.
	 */
	// eslint-disable-next-line @typescript-eslint/require-await
	protected async _getPatchBinary() {
		const {removeCodeSignature, patchWindowTitle} = this;

		// Skip if no patching was requested.
		if (!(removeCodeSignature || patchWindowTitle !== null)) {
			return null;
		}

		let count = 0;
		const patch: IFilePatch = {
			// eslint-disable-next-line jsdoc/require-jsdoc
			match: (file: string) =>
				/^[^/]+\/Contents\/MacOS\/[^/]+$/i.test(file),
			// eslint-disable-next-line jsdoc/require-jsdoc
			modify: (data: Uint8Array) => {
				data = macProjectorMachoPatch(data, {
					removeCodeSignature,
					patchWindowTitle
				});
				count++;
				return data;
			},
			// eslint-disable-next-line jsdoc/require-jsdoc
			after: () => {
				if (!count) {
					throw new Error('Failed to locate binary for patching');
				}
			}
		};
		return patch;
	}

	/**
	 * Get patch for Info.plist and dependancies.
	 *
	 * @returns Patch spec.
	 */
	protected async _getPatchInfoPlist() {
		const bundleName = this.getBundleName();
		const customPlist = await this.getInfoPlistData();
		const iconData = await this.getIconData();
		const {
			binaryName,
			appIconName,
			removeFileAssociations,
			appPathInfoPlist,
			appRsrcName
		} = this;
		const modifyPlist = !!(
			customPlist !== null ||
			appIconName ||
			binaryName ||
			bundleName !== false ||
			removeFileAssociations
		);

		let count = 0;
		let xmlOld: string | null = '';
		const lower = modifyPlist ? appPathInfoPlist.toLowerCase() : '';
		const patch: IFilePatch = {
			// eslint-disable-next-line jsdoc/require-jsdoc
			match: (file: string) =>
				modifyPlist &&
				file.substring(file.indexOf('/') + 1).toLowerCase() === lower,
			// eslint-disable-next-line jsdoc/require-jsdoc
			modify: (data: Uint8Array) => {
				// Use a custom plist or the existing one.
				xmlOld = new TextDecoder().decode(data);
				const plist = new Plist();
				plist.fromXml(customPlist || xmlOld);
				const dict = plist.getValue().castAs(ValueDict);

				if (appIconName) {
					dict.set('CFBundleIconFile', new ValueString(appIconName));
				}

				if (binaryName) {
					dict.set('CFBundleExecutable', new ValueString(binaryName));
				}

				if (bundleName !== false) {
					const key = 'CFBundleName';
					if (bundleName === null) {
						dict.delete(key);
					} else {
						dict.set(key, new ValueString(bundleName));
					}
				}

				if (removeFileAssociations) {
					dict.delete('CFBundleDocumentTypes');
				}

				data = new TextEncoder().encode(plist.toXml());
				count++;
				return data;
			},
			// eslint-disable-next-line jsdoc/require-jsdoc
			after: async () => {
				if (modifyPlist && !count) {
					throw new Error(
						`Failed to locate for update: ${appPathInfoPlist}`
					);
				}

				const tasks = [];
				let oldDictValue: ValueDict | null = null;

				// eslint-disable-next-line jsdoc/require-jsdoc
				const oldDict = async () => {
					if (!oldDictValue) {
						const plist = new Plist();
						plist.fromXml(
							xmlOld ??
								(await readFile(this.infoPlistPath, 'utf8'))
						);
						oldDictValue = plist.getValue().castAs(ValueDict);
					}
					return oldDictValue;
				};

				if (binaryName) {
					const binaryOld = (await oldDict())
						.getValue('CFBundleExecutable')
						.castAs(ValueString).value;

					const binaryPathOld = this.getBinaryPath(binaryOld);
					const binaryPathNew = this.getBinaryPath(binaryName);
					tasks.push(async () =>
						rename(binaryPathOld, binaryPathNew)
					);

					const rsrcPathOld = this.getRsrcPath(binaryOld, true);
					if (!appRsrcName) {
						throw new Error('Internal error');
					}
					const rsrcPathNew = this.getRsrcPath(appRsrcName);
					tasks.push(async () =>
						rename(rsrcPathOld, rsrcPathNew).catch(err => {
							// The rsrc file does not exist in 35+.
							if (
								!err ||
								(err as {code: string}).code !== 'ENOENT'
							) {
								throw err;
							}
						})
					);
				}

				if (appIconName || iconData) {
					const oldIconName = (await oldDict())
						.getValue('CFBundleIconFile')
						.castAs(ValueString).value;
					let iconPathOld = this.getIconPath(oldIconName);

					// Implicit extension (old projectors).
					if (!oldIconName.includes('.')) {
						iconPathOld += '.icns';
					}

					if (appIconName) {
						const iconPathNew = this.getIconPath(appIconName);
						tasks.push(async () =>
							rename(iconPathOld, iconPathNew).then(async () => {
								if (iconData) {
									await writeFile(iconPathNew, iconData);
								}
							})
						);
					} else if (iconData) {
						tasks.push(async () =>
							writeFile(iconPathOld, iconData)
						);
					}
				}

				await Promise.all(tasks.map(async f => f()));
			}
		};
		return patch;
	}
}

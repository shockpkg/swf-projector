import {mkdir, readFile, rename, rm, stat, writeFile} from 'fs/promises';
import {join as pathJoin, basename, dirname} from 'path';

import {ArchiveDir, fsWalk, PathType} from '@shockpkg/archive-files';
import {Plist} from '@shockpkg/plist-dom';

import {trimExtension} from '../../util';
import {
	plistRead,
	plistParse,
	infoPlistBundleExecutableGet,
	infoPlistBundleExecutableSet,
	infoPlistBundleIconFileGet,
	infoPlistBundleIconFileSet,
	infoPlistBundleNameSet,
	infoPlistBundleDocumentTypesDelete,
	macProjectorMachoPatch
} from '../../util/mac';
import {ProjectorMac} from '../mac';

/**
 * ProjectorMacApp object.
 */
export class ProjectorMacApp extends ProjectorMac {
	/**
	 * Binary name, also renames rsrc and icns.
	 */
	public binaryName: string | null = null;

	/**
	 * Icon file.
	 */
	public iconFile: string | null = null;

	/**
	 * Icon data.
	 */
	public iconData: Readonly<Buffer> | null = null;

	/**
	 * Info.plist file.
	 * Currently only supports XML plist.
	 */
	public infoPlistFile: string | null = null;

	/**
	 * Info.plist data.
	 * Currently only supports XML plist.
	 */
	public infoPlistData: string | Readonly<Buffer> | null = null;

	/**
	 * PkgInfo file.
	 */
	public pkgInfoFile: string | null = null;

	/**
	 * PkgInfo data.
	 */
	public pkgInfoData: string | Readonly<Buffer> | null = null;

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
	 * Fix broken icon paths in Info.plist (old projectors).
	 */
	public fixBrokenIconPaths = false;

	/**
	 * Attempt to patch the window title with a custom title.
	 * Currently supports versions 11+.
	 */
	public patchWindowTitle: string | null = null;

	/**
	 * ProjectorMacApp constructor.
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
		return iconData || (iconFile ? readFile(iconFile) : null);
	}

	/**
	 * Get Info.plist data if any specified, document, data, or file.
	 *
	 * @returns Info.plist data or null.
	 */
	public async getInfoPlistDocument() {
		const {infoPlistData, infoPlistFile} = this;
		let xml;
		if (typeof infoPlistData === 'string') {
			xml = infoPlistData;
		} else if (infoPlistData) {
			xml = infoPlistData.toString('utf8');
		} else if (infoPlistFile) {
			xml = await readFile(infoPlistFile, 'utf8');
		} else {
			return null;
		}
		return plistParse(xml);
	}

	/**
	 * Get PkgInfo data if any specified, from data or file.
	 *
	 * @returns PkgInfo data or null.
	 */
	public async getPkgInfoData() {
		const {pkgInfoData, pkgInfoFile} = this;
		if (typeof pkgInfoData === 'string') {
			return Buffer.from(pkgInfoData, 'ascii');
		}
		return pkgInfoData || (pkgInfoFile ? readFile(pkgInfoFile) : null);
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
	 * Write the projector player.
	 *
	 * @param player Player path.
	 */
	protected async _writePlayer(player: string) {
		const {path, extension} = this;
		const extLower = extension.toLowerCase();
		let archive;
		let isPlayer: (path: string) => boolean;
		if (
			player.toLowerCase().endsWith(extLower) &&
			(await stat(player)).isDirectory()
		) {
			const name = basename(player);
			archive = await this._openArchive(dirname(player));
			(archive as ArchiveDir).subpaths = [name];
			// eslint-disable-next-line jsdoc/require-jsdoc
			isPlayer = (path: string) => path === name;
		} else {
			archive = await this._openArchive(player);
			// eslint-disable-next-line jsdoc/require-jsdoc
			isPlayer = (path: string) => path.toLowerCase().endsWith(extLower);
		}

		let playerPath = '';
		await archive.read(async entry => {
			// No resource forks expected.
			if (entry.type === PathType.RESOURCE_FORK) {
				return true;
			}

			const {volumePath} = entry;

			// Ignore any dot files and directories and all their children.
			if (volumePath.startsWith('.') || volumePath.includes('/.')) {
				return null;
			}

			// Look for the player.
			if (isPlayer(volumePath)) {
				if (playerPath) {
					throw new Error(
						`Found multiple players in archive: ${player}`
					);
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
			await entry.extract(dest);
			return true;
		});

		if (!playerPath) {
			throw new Error(`Failed to locate player in archive: ${player}`);
		}
	}

	/**
	 * @inheritDoc
	 */
	protected async _modifyPlayer(movieData: Readonly<Buffer> | null) {
		await this._fixPlayerIconPath();
		await this._removeInfoPlistStrings();
		await this._patchProjector();
		await this._replaceIcon();
		await this._replacePkgInfo();
		await this._updateContentPaths();
		await this._updateInfoPlist();
		await this._writeMovie(movieData);
	}

	/**
	 * Patch projector.
	 */
	protected async _patchProjector() {
		const {path, removeCodeSignature, patchWindowTitle} = this;

		// Skip if no patching was requested.
		if (!(removeCodeSignature || patchWindowTitle !== null)) {
			return;
		}

		// Patch the projector binary.
		const plist = await this._readInfoPlist();
		const executableName = infoPlistBundleExecutableGet(plist);
		const binaryPath = this.getBinaryPath(executableName);
		await writeFile(
			binaryPath,
			macProjectorMachoPatch(await readFile(binaryPath), {
				removeCodeSignature,
				patchWindowTitle
			})
		);

		// Finish removing the signature if requested.
		if (removeCodeSignature) {
			const contents = pathJoin(path, 'Contents');
			await Promise.all([
				rm(pathJoin(contents, 'CodeResources'), {
					recursive: true,
					force: true
				}),
				rm(pathJoin(contents, '_CodeSignature'), {
					recursive: true,
					force: true
				})
			]);
		}
	}

	/**
	 * Write out the projector movie file.
	 *
	 * @param movieData Movie data or null.
	 */
	protected async _writeMovie(movieData: Readonly<Buffer> | null) {
		if (!movieData) {
			return;
		}

		await writeFile(this.moviePath, movieData);
	}

	/**
	 * Fix the icon path in some old projectors.
	 */
	protected async _fixPlayerIconPath() {
		const {fixBrokenIconPaths} = this;
		if (!fixBrokenIconPaths) {
			return;
		}

		const plist = await this._readInfoPlist();

		// Add the icon extension or skip if present.
		const iconFile = infoPlistBundleIconFileGet(plist);
		if (iconFile.includes('.')) {
			return;
		}
		infoPlistBundleIconFileSet(plist, `${iconFile}.icns`);

		await this._writeInfoPlist(plist);
	}

	/**
	 * Remove InfoPlist.strings localization files if present.
	 */
	protected async _removeInfoPlistStrings() {
		const {path, removeInfoPlistStrings} = this;
		if (!removeInfoPlistStrings) {
			return;
		}

		await fsWalk(this.path, async (p, s) => {
			if (
				s.isFile() &&
				dirname(p).endsWith('.lproj') &&
				/^InfoPlist\.strings$/i.test(basename(p))
			) {
				await rm(pathJoin(path, p));
			}
		});
	}

	/**
	 * Replace projector icon file.
	 */
	protected async _replaceIcon() {
		const data = await this.getIconData();
		if (!data) {
			return;
		}

		const plist = await this._readInfoPlist();
		const iconName = infoPlistBundleIconFileGet(plist);

		const path = this.getIconPath(iconName);
		await rm(path, {force: true});
		await mkdir(dirname(path), {recursive: true});
		await writeFile(path, data);
	}

	/**
	 * Replace projector PkgInfo file.
	 */
	protected async _replacePkgInfo() {
		const data = await this.getPkgInfoData();
		if (!data) {
			return;
		}

		const path = this.pkgInfoPath;
		await rm(path, {force: true});
		await mkdir(dirname(path), {recursive: true});
		await writeFile(path, data);
	}

	/**
	 * Update paths in the projector bundle.
	 */
	protected async _updateContentPaths() {
		const {binaryName, appIconName, appRsrcName} = this;
		if (!(binaryName || appIconName)) {
			return;
		}

		const plist = await this._readInfoPlist();

		if (binaryName) {
			const executableName = infoPlistBundleExecutableGet(plist);
			const rsrcPathOld = this.getRsrcPath(executableName, true);
			if (!appRsrcName) {
				throw new Error('Internal error');
			}
			const rsrcPathNew = this.getRsrcPath(appRsrcName);

			const binaryPathOld = this.getBinaryPath(executableName);
			const binaryPathNew = this.getBinaryPath(binaryName);

			await rename(binaryPathOld, binaryPathNew);
			try {
				await rename(rsrcPathOld, rsrcPathNew);
			} catch (err) {
				// The rsrc file does not exist in 35+.
				if (!err || (err as {code: string}).code !== 'ENOENT') {
					throw err;
				}
			}
		}

		if (appIconName) {
			const iconName = infoPlistBundleIconFileGet(plist);

			const iconPathOld = this.getIconPath(iconName);
			const iconPathNew = this.getIconPath(appIconName);

			await rename(iconPathOld, iconPathNew);
		}
	}

	/**
	 * Update the projector Info.plist if needed.
	 */
	protected async _updateInfoPlist() {
		const customPlist = await this.getInfoPlistDocument();
		const bundleName = this.getBundleName();
		const {binaryName, appIconName, removeFileAssociations} = this;
		if (
			!(
				customPlist ||
				appIconName ||
				binaryName ||
				bundleName !== false ||
				removeFileAssociations
			)
		) {
			return;
		}

		// Use a custom plist or the existing one.
		const plist = customPlist || (await this._readInfoPlist());

		// Update values.
		if (appIconName) {
			infoPlistBundleIconFileSet(plist, appIconName);
		}
		if (binaryName) {
			infoPlistBundleExecutableSet(plist, binaryName);
		}
		if (bundleName !== false) {
			infoPlistBundleNameSet(plist, bundleName);
		}
		if (removeFileAssociations) {
			infoPlistBundleDocumentTypesDelete(plist);
		}

		// Write out the plist.
		await this._writeInfoPlist(plist);
	}

	/**
	 * Read the projector Info.plist file.
	 *
	 * @returns Plist document.
	 */
	protected async _readInfoPlist() {
		return plistRead(this.infoPlistPath);
	}

	/**
	 * Write the projector Info.plist file.
	 *
	 * @param plist Plist document.
	 */
	protected async _writeInfoPlist(plist: Plist) {
		const path = this.infoPlistPath;
		await rm(path, {force: true});
		await mkdir(dirname(path), {recursive: true});
		await writeFile(path, plist.toXml(), 'utf8');
	}
}

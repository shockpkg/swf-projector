import {
	join as pathJoin
} from 'path';

import {
	ArchiveDir,
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';
import {
	Plist
} from '@shockpkg/plist-dom';
import fse from 'fs-extra';

import {
	Projector
} from '../projector';
import {
	pathRelativeBase
} from '../util';
import {
	appUnsign,
	plistRead,
	plistParse,
	infoPlistBundleExecutableGet,
	infoPlistBundleExecutableSet,
	infoPlistBundleIconFileGet,
	infoPlistBundleIconFileSet,
	infoPlistBundleNameSet,
	infoPlistBundleDocumentTypesDelete
} from '../utils/mac';

/**
 * ProjectorMacApp constructor.
 *
 * @param path Output path.
 */
export class ProjectorMacApp extends Projector {
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
	 */
	public infoPlistFile: string | null = null;

	/**
	 * Info.plist data.
	 */
	public infoPlistData: (
		string | Readonly<string[]> | Readonly<Buffer> | null
	) = null;

	/**
	 * Info.plist document.
	 */
	public infoPlistDocument: Plist | null = null;

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
	 *
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
	 * Remove the code signature.
	 * Modern projectors are codesigned so that any changes breaks it.
	 * No signature is better than a broken one.
	 */
	public removeCodeSignature = false;

	/**
	 * Fix broken icon paths in Info.plist (old projectors).
	 */
	public fixBrokenIconPaths = false;

	constructor(path: string) {
		super(path);
	}

	/**
	 * Projector file extension.
	 *
	 * @returns File extension.
	 */
	public get projectorExtension() {
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
		return iconData || (iconFile ? fse.readFile(iconFile) : null);
	}

	/**
	 * Get Info.plist data if any specified, document, data, or file.
	 *
	 * @returns Info.plist data or null.
	 */
	public async getInfoPlistDocument() {
		const {
			infoPlistDocument,
			infoPlistData,
			infoPlistFile
		} = this;
		let xml;
		if (infoPlistDocument) {
			xml = infoPlistDocument.toXml();
		}
		if (typeof infoPlistData === 'string') {
			xml = infoPlistData;
		}
		else if (Array.isArray(infoPlistData)) {
			xml = infoPlistData.join('\n');
		}
		else if (infoPlistData) {
			xml = (infoPlistData as Readonly<Buffer>).toString('utf8');
		}
		else if (infoPlistFile) {
			xml = await fse.readFile(infoPlistFile, 'utf8');
		}
		else {
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
		return pkgInfoData || (pkgInfoFile ? fse.readFile(pkgInfoFile) : null);
	}

	/**
	 * Get the movie path.
	 *
	 * @returns Icon path.
	 */
	public getMoviePath() {
		return pathJoin(this.path, this.appPathMovie);
	}

	/**
	 * Get the Info.plist path.
	 *
	 * @returns Icon path.
	 */
	public getInfoPlistPath() {
		return pathJoin(this.path, this.appPathInfoPlist);
	}

	/**
	 * Get the PkgInfo path.
	 *
	 * @returns Icon path.
	 */
	public getPkgInfoPath() {
		return pathJoin(this.path, this.appPathPkgInfo);
	}

	/**
	 * Get configured bundle name, or null to remove.
	 *
	 * @returns New name or null.
	 */
	public getBundleName() {
		const {bundleName} = this;
		return bundleName === true ? this.getProjectorName() : bundleName;
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
			(await fse.stat(player)).isDirectory()
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
		if (!stat.isDirectory()) {
			throw new Error(`Path is not directory: ${player}`);
		}

		const playerOut = this.path;
		await fse.ensureDir(playerOut);

		// Open directory as archive, for copying.
		const archive = new ArchiveDir(player);
		await archive.read(async entry => {
			// No resource forks expected.
			if (entry.type === PathType.RESOURCE_FORK) {
				return;
			}

			await entry.extract(pathJoin(playerOut, entry.volumePath));
		});

		await fsChmod(playerOut, modePermissionBits(stat.mode));
		await fsUtimes(playerOut, stat.atime, stat.mtime);
	}

	/**
	 * Write the projector player, from archive.
	 */
	protected async _writePlayerArchive() {
		const projectorExtensionLower = this.projectorExtension.toLowerCase();
		let playerName = '';
		const {path} = this;

		const player = this.getPlayerPath();
		const archive = await this.openAsArchive(player);
		await archive.read(async entry => {
			// No resource forks expected.
			if (entry.type === PathType.RESOURCE_FORK) {
				return;
			}

			const {volumePath} = entry;

			const slashIndex = volumePath.indexOf('/');
			const base = slashIndex > -1 ?
				volumePath.substr(0, slashIndex) :
				volumePath;
			const baseLower = base.toLowerCase();

			if (baseLower.startsWith('.')) {
				return;
			}
			if (!baseLower.endsWith(projectorExtensionLower)) {
				return;
			}

			if (playerName && playerName !== base) {
				throw new Error(`Found multiple players in archive: ${player}`);
			}
			playerName = base;

			const rel = pathRelativeBase(volumePath, base);
			if (rel === null) {
				throw new Error('Internal error');
			}

			const extractPath = pathJoin(path, rel);
			await entry.extract(extractPath);
		});

		if (!playerName) {
			throw new Error(`Failed to locate player in archive: ${player}`);
		}
	}

	/**
	 * Modify the projector player.
	 */
	protected async _modifyPlayer() {
		await this._removeCodeSignature();
		await this._fixPlayer();
		await this._writeIcon();
		await this._writePkgInfo();
		await this._updateContentPaths();
		await this._updateInfoPlist();
	}

	/**
	 * Write out the projector movie file.
	 */
	protected async _writeMovie() {
		const data = await this.getMovieData();
		if (!data) {
			return;
		}

		await fse.writeFile(this.getMoviePath(), data);
	}

	/**
	 * A method to fix some partially broken players.
	 */
	protected async _fixPlayer() {
		await this._fixPlayerIconPath();
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
	 * Write out the projector icon file.
	 */
	protected async _writeIcon() {
		const data = await this.getIconData();
		if (!data) {
			return;
		}

		const plist = await this._readInfoPlist();
		const iconName = infoPlistBundleIconFileGet(plist);

		const path = this.getIconPath(iconName);
		await fse.remove(path);
		await fse.outputFile(path, data);
	}

	/**
	 * Write out the projector PkgInfo file.
	 */
	protected async _writePkgInfo() {
		const data = await this.getPkgInfoData();
		if (!data) {
			return;
		}

		const path = this.getPkgInfoPath();
		await fse.remove(path);
		await fse.outputFile(path, data);
	}

	/**
	 * Remove projector code signature if enabled.
	 */
	protected async _removeCodeSignature() {
		if (!this.removeCodeSignature) {
			return;
		}

		await appUnsign(this.path);
	}

	/**
	 * Update paths in the projector bundle.
	 */
	protected async _updateContentPaths() {
		const {
			binaryName,
			appIconName,
			appRsrcName
		} = this;
		if (!(
			binaryName ||
			appIconName
		)) {
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

			await fse.move(binaryPathOld, binaryPathNew);
			await fse.move(rsrcPathOld, rsrcPathNew);
		}

		if (appIconName) {
			const iconName = infoPlistBundleIconFileGet(plist);

			const iconPathOld = this.getIconPath(iconName);
			const iconPathNew = this.getIconPath(appIconName);

			await fse.move(iconPathOld, iconPathNew);
		}
	}

	/**
	 * Update the projector Info.plist if needed.
	 */
	protected async _updateInfoPlist() {
		const customPlist = await this.getInfoPlistDocument();
		const bundleName = this.getBundleName();
		const {
			binaryName,
			appIconName,
			removeFileAssociations
		} = this;
		if (!(
			customPlist ||
			appIconName ||
			binaryName ||
			bundleName !== false ||
			removeFileAssociations
		)) {
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
		return plistRead(this.getInfoPlistPath());
	}

	/**
	 * Write the projector Info.plist file.
	 *
	 * @param plist Plist document.
	 */
	protected async _writeInfoPlist(plist: Plist) {
		const path = this.getInfoPlistPath();
		await fse.remove(path);
		await fse.outputFile(path, plist.toXml(), 'utf8');
	}
}

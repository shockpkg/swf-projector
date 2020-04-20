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
	unsign
} from 'macho-unsign';
import fse from 'fs-extra';

import {
	Projector
} from '../projector';
import {
	infoPlistRead,
	infoPlistReplace,
	pathRelativeBase,
	plistStringTagDecode,
	plistStringTagEncode
} from '../util';

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
	 * PkgInfo file.
	 */
	public pkgInfoFile: string | null = null;

	/**
	 * PkgInfo data.
	 */
	public pkgInfoData: string | Readonly<Buffer> | null = null;

	/**
	 * Update the bundle name in Info.plist.
	 */
	public updateBundleName = false;

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
	 * If icon is specified.
	 *
	 * @returns Is specified.
	 */
	public get hasIcon() {
		return !!(this.iconData || this.iconFile);
	}

	/**
	 * If Info.plist is specified.
	 *
	 * @returns Is specified.
	 */
	public get hasInfoPlist() {
		return !!(this.infoPlistData || this.infoPlistFile);
	}

	/**
	 * If PkgInfo is specified.
	 *
	 * @returns Is specified.
	 */
	public get hasPkgInfo() {
		return !!(this.pkgInfoData || this.pkgInfoFile);
	}

	/**
	 * Get app icon name, custom.
	 *
	 * @returns File name.
	 */
	public get appIconNameCustom() {
		const n = this.binaryName;
		return n ? `${n}.icns` : null;
	}

	/**
	 * Get app rsrc name, custom.
	 *
	 * @returns File name.
	 */
	public get appRsrcNameCustom() {
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
	 * @param binaryName Binary name.
	 * @param addExt Add extension.
	 * @returns Rsrc path.
	 */
	public getRsrcPath(binaryName: string, addExt = false) {
		const name = addExt ? `${binaryName}.rsrc` : binaryName;
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
		return this._dataFromBufferOrFile(
			this.iconData,
			this.iconFile
		);
	}

	/**
	 * Get Info.plist data if any specified, from data or file.
	 *
	 * @returns Info.plist data or null.
	 */
	public async getInfoPlistData() {
		return this._dataFromValueOrFile(
			this.infoPlistData,
			this.infoPlistFile,
			'\n',
			'utf8'
		);
	}

	/**
	 * Get PkgInfo data if any specified, from data or file.
	 *
	 * @returns PkgInfo data or null.
	 */
	public async getPkgInfoData() {
		return this._dataFromValueOrFile(
			this.pkgInfoData,
			this.pkgInfoFile,
			null,
			'ascii'
		);
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
	 * Update XML code with customized variables.
	 *
	 * @param xml Plist code.
	 * @returns Updated XML.
	 */
	public updateInfoPlistCode(xml: string) {
		const {
			binaryName,
			appIconNameCustom,
			updateBundleName,
			removeFileAssociations
		} = this;

		if (appIconNameCustom) {
			xml = infoPlistReplace(
				xml,
				'CFBundleIconFile',
				plistStringTagEncode(appIconNameCustom)
			);
		}
		if (binaryName) {
			xml = infoPlistReplace(
				xml,
				'CFBundleExecutable',
				plistStringTagEncode(binaryName)
			);
		}
		if (updateBundleName) {
			xml = infoPlistReplace(
				xml,
				'CFBundleName',
				plistStringTagEncode(this.getProjectorNameNoExtension())
			);
		}
		if (removeFileAssociations) {
			xml = infoPlistReplace(
				xml,
				'CFBundleDocumentTypes',
				'<array></array>'
			);
		}

		return xml;
	}

	/**
	 * Write the projector player.
	 */
	protected async _writePlayer() {
		const player = this.getPlayerPath();
		const stat = await fse.stat(player);
		const projectorExtensionLower = this.projectorExtension.toLowerCase();

		if (
			stat.isDirectory() &&
			player.toLowerCase().endsWith(projectorExtensionLower)
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
				volumePath.substr(0, slashIndex) : volumePath;
			const baseLower = base.toLowerCase();

			// eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
			if (baseLower.charAt(0) === '.') {
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
		await this._updateBinaryName();
		await this._writeInfoPlist();
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

		await this._maybeWriteFile(data, this.getMoviePath(), true);
	}

	/**
	 * A method to fix some partially broken players.
	 * Currently fixes the icon in some old projectors.
	 */
	protected async _fixPlayer() {
		const {fixBrokenIconPaths} = this;
		if (!fixBrokenIconPaths) {
			return;
		}

		const xmlOriginal = await this._readInfoPlist();
		let xml = xmlOriginal;

		// Add the icon extension.
		const iconName = this._readInfoPlistIcon(xml);
		if (!iconName.includes('.')) {
			xml = infoPlistReplace(
				xml,
				'CFBundleIconFile',
				plistStringTagEncode(`${iconName}.icns`)
			);
		}

		// Write file if changed.
		if (xml === xmlOriginal) {
			return;
		}
		await this._maybeWriteFile(
			Buffer.from(xml, 'utf8'),
			this.getInfoPlistPath(),
			true
		);
	}

	/**
	 * Write out the projector icon file.
	 */
	protected async _writeIcon() {
		const data = await this.getIconData();
		if (!data) {
			return;
		}

		const xml = await this._readInfoPlist();
		const iconName = this._readInfoPlistIcon(xml);

		await this._maybeWriteFile(data, this.getIconPath(iconName), true);
	}

	/**
	 * Write out the projector PkgInfo file.
	 */
	protected async _writePkgInfo() {
		const data = await this.getPkgInfoData();
		await this._maybeWriteFile(data, this.getPkgInfoPath(), true);
	}

	/**
	 * Remove projector code signature if enabled.
	 */
	protected async _removeCodeSignature() {
		if (!this.removeCodeSignature) {
			return;
		}

		// Locate the main binary.
		const xml = await this._readInfoPlist();
		const executableName = this._readInfoPlistExecutable(xml);
		const executablePath = this.getBinaryPath(executableName);

		// Unsign binary if signed.
		await this._unsignMachO(executablePath);

		// Cleanup signature file and directory that may exist.
		await fse.remove(pathJoin(this.path, 'Contents/CodeResources'));
		await fse.remove(pathJoin(this.path, 'Contents/_CodeSignature'));
	}

	/**
	 * Update projector binary name.
	 */
	protected async _updateBinaryName() {
		const {
			binaryName,
			appIconNameCustom,
			appRsrcNameCustom
		} = this;

		if (!binaryName && !appIconNameCustom) {
			return;
		}

		const xml = await this._readInfoPlist();

		if (binaryName) {
			const executableName = this._readInfoPlistExecutable(xml);

			const rsrcPathOld = this.getRsrcPath(executableName, true);
			if (!appRsrcNameCustom) {
				throw new Error('Internal error');
			}
			const rsrcPathNew = this.getRsrcPath(appRsrcNameCustom);

			const binaryPathOld = this.getBinaryPath(executableName);
			const binaryPathNew = this.getBinaryPath(binaryName);

			await fse.move(binaryPathOld, binaryPathNew);
			await fse.move(rsrcPathOld, rsrcPathNew);
		}

		if (appIconNameCustom) {
			const iconName = this._readInfoPlistIcon(xml);
			const iconPathOld = this.getIconPath(iconName);
			const iconPathNew = this.getIconPath(appIconNameCustom);

			await fse.move(iconPathOld, iconPathNew);
		}
	}

	/**
	 * Write out the projector Info.plist file.
	 */
	protected async _writeInfoPlist() {
		const data = await this.getInfoPlistData();
		await this._maybeWriteFile(data, this.getInfoPlistPath(), true);
	}

	/**
	 * Update the projector Info.plist file fields.
	 */
	protected async _updateInfoPlist() {
		const xmlOriginal = await this._readInfoPlist();
		const xml = this.updateInfoPlistCode(xmlOriginal);

		// Write file if changed.
		if (xml === xmlOriginal) {
			return;
		}
		await this._maybeWriteFile(
			Buffer.from(xml, 'utf8'),
			this.getInfoPlistPath(),
			true
		);
	}

	/**
	 * Read the projector Info.plist file.
	 *
	 * @returns File data.
	 */
	protected async _readInfoPlist() {
		const file = this.getInfoPlistPath();
		const data = await this._dataFromBufferOrFile(null, file);
		if (!data) {
			throw new Error('Failed to read Info.plist');
		}
		return data.toString('utf8');
	}

	/**
	 * Read executable name from Info.plist XML.
	 *
	 * @param xml XML string.
	 * @returns Field value.
	 */
	protected _readInfoPlistExecutable(xml: string) {
		const tag = infoPlistRead(xml, 'CFBundleExecutable');
		const value = tag ? plistStringTagDecode(tag) : null;
		if (!value) {
			throw new Error('Failed to read Info.plist executable field');
		}
		return value;
	}

	/**
	 * Read icon name from Info.plist XML.
	 *
	 * @param xml XML string.
	 * @returns Field value.
	 */
	protected _readInfoPlistIcon(xml: string) {
		const tag = infoPlistRead(xml, 'CFBundleIconFile');
		const value = tag ? plistStringTagDecode(tag) : null;
		if (!value) {
			throw new Error('Failed to read Info.plist icon field');
		}
		return value;
	}

	/**
	 * Unsign a Mach-O binary if signed.
	 *
	 * @param path Binary path.
	 * @returns Returns true if signed, else false.
	 */
	protected async _unsignMachO(path: string) {
		const data = await fse.readFile(path);

		// Unsign data if signed.
		const unsigned = unsign(data);
		if (!unsigned) {
			return false;
		}

		// Write out the change.
		await fse.writeFile(path, Buffer.from(unsigned));
		return true;
	}
}

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
import fse from 'fs-extra';

import {
	IProjectorOptions,
	Projector
} from '../projector';
import {
	defaultFalse,
	defaultNull,
	infoPlistRead,
	infoPlistReplace,
	pathRelativeBase,
	plistStringTagDecode,
	plistStringTagEncode
} from '../util';
import {
	macCodesignRemove
} from '../utils/mac';

export interface IProjectorMacAppOptions extends IProjectorOptions {

	/**
	 * Binary name, also renames rsrc and icns.
	 *
	 * @default null
	 */
	binaryName?: string | null;

	/**
	 * Icon file.
	 *
	 * @default null
	 */
	iconFile?: string | null;

	/**
	 * Icon data.
	 *
	 * @default null
	 */
	iconData?: Buffer | null;

	/**
	 * Info.plist file.
	 *
	 * @default null
	 */
	infoPlistFile?: string | null;

	/**
	 * Info.plist data.
	 *
	 * @default null
	 */
	infoPlistData?: Buffer | null;

	/**
	 * PkgInfo file.
	 *
	 * @default null
	 */
	pkgInfoFile?: string | null;

	/**
	 * PkgInfo data.
	 *
	 * @default null
	 */
	pkgInfoData?: Buffer | null;

	/**
	 * Update the bundle name in Info.plist.
	 *
	 * @default false
	 */
	updateBundleName?: boolean;

	/**
	 * Remove the file associations in Info.plist.
	 *
	 * @default false
	 */
	removeFileAssociations?: boolean;

	/**
	 * Remove the code signature.
	 * Modern projectors are codesigned so that any changes breaks it.
	 * No signature is better than a broken one.
	 *
	 * @default false
	 */
	removeCodeSignature?: boolean;

	/**
	 * Path to codesign binary.
	 *
	 * @default null
	 */
	codesignPath?: string | null;

	/**
	 * Fix broken icon paths in Info.plist (old projectors).
	 *
	 * @default false
	 */
	fixBrokenIconPaths?: boolean;
}

/**
 * ProjectorMacApp constructor.
 *
 * @param options Options object.
 */
export class ProjectorMacApp extends Projector {
	/**
	 * Binary name, also renames rsrc and icns.
	 *
	 * @default null
	 */
	public binaryName: string | null;

	/**
	 * Icon file.
	 *
	 * @default null
	 */
	public iconFile: string | null;

	/**
	 * Icon data.
	 *
	 * @default null
	 */
	public iconData: Buffer | null;

	/**
	 * Info.plist file.
	 *
	 * @default null
	 */
	public infoPlistFile: string | null;

	/**
	 * Info.plist data.
	 *
	 * @default null
	 */
	public infoPlistData: string | string[] | Buffer | null;

	/**
	 * PkgInfo file.
	 *
	 * @default null
	 */
	public pkgInfoFile: string | null;

	/**
	 * PkgInfo data.
	 *
	 * @default null
	 */
	public pkgInfoData: string | Buffer | null;

	/**
	 * Update the bundle name in Info.plist.
	 *
	 * @default false
	 */
	public updateBundleName: boolean;

	/**
	 * Remove the file associations in Info.plist.
	 *
	 * @default false
	 */
	public removeFileAssociations: boolean;

	/**
	 * Remove the code signature.
	 * Modern projectors are codesigned so that any changes breaks it.
	 * No signature is better than a broken one.
	 *
	 * @default false
	 */
	public removeCodeSignature: boolean;

	/**
	 * Path to codesign binary.
	 *
	 * @default null
	 */
	public codesignPath: string | null;

	/**
	 * Fix broken icon paths in Info.plist (old projectors).
	 *
	 * @default false
	 */
	public fixBrokenIconPaths: boolean;

	constructor(options: IProjectorMacAppOptions = {}) {
		super(options);

		this.binaryName = defaultNull(options.binaryName);
		this.iconFile = defaultNull(options.iconFile);
		this.iconData = defaultNull(options.iconData);
		this.infoPlistFile = defaultNull(options.infoPlistFile);
		this.infoPlistData = defaultNull(options.infoPlistData);
		this.pkgInfoFile = defaultNull(options.pkgInfoFile);
		this.pkgInfoData = defaultNull(options.pkgInfoData);
		this.updateBundleName = defaultFalse(options.updateBundleName);
		this.removeFileAssociations =
			defaultFalse(options.removeFileAssociations);
		this.removeCodeSignature = defaultFalse(options.removeCodeSignature);
		this.codesignPath = defaultNull(options.codesignPath);
		this.fixBrokenIconPaths = defaultFalse(options.fixBrokenIconPaths);
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
	 * @param name Save name.
	 * @param binaryName Binary name.
	 * @returns Binary path.
	 */
	public getBinaryPath(name: string, binaryName: string) {
		return `${name}/Contents/MacOS/${binaryName}`;
	}

	/**
	 * Get the rsrc path.
	 *
	 * @param name Save name.
	 * @param binaryName Binary name.
	 * @param addExt Add extension.
	 * @returns Rsrc path.
	 */
	public getRsrcPath(name: string, binaryName: string, addExt = false) {
		const ext = addExt ? '.rsrc' : '';
		return `${name}/Contents/Resources/${binaryName}${ext}`;
	}

	/**
	 * Get the icon path.
	 *
	 * @param name Save name.
	 * @param iconName Icon name.
	 * @returns Icon path.
	 */
	public getIconPath(name: string, iconName: string) {
		return `${name}/Contents/Resources/${iconName}`;
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
	 * @param name Save name.
	 * @returns Icon path.
	 */
	public getMoviePath(name: string) {
		return `${name}/${this.appPathMovie}`;
	}

	/**
	 * Get the Info.plist path.
	 *
	 * @param name Save name.
	 * @returns Icon path.
	 */
	public getInfoPlistPath(name: string) {
		return `${name}/${this.appPathInfoPlist}`;
	}

	/**
	 * Get the PkgInfo path.
	 *
	 * @param name Save name.
	 * @returns Icon path.
	 */
	public getPkgInfoPath(name: string) {
		return `${name}/${this.appPathPkgInfo}`;
	}

	/**
	 * Update XML code with customized variables.
	 *
	 * @param xml Plist code.
	 * @param name Application name.
	 * @returns Updated XML.
	 */
	public updateInfoPlistCode(xml: string, name: string) {
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
				plistStringTagEncode(this.getProjectorNameNoExtension(name))
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
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writePlayer(path: string, name: string) {
		const player = this.getPlayerPath();
		const stat = await fse.stat(player);
		const projectorExtensionLower = this.projectorExtension.toLowerCase();

		if (
			stat.isDirectory() &&
			player.toLowerCase().endsWith(projectorExtensionLower)
		) {
			await this._writePlayerFile(path, name);
		}
		else {
			await this._writePlayerArchive(path, name);
		}
	}

	/**
	 * Write the projector player, from file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writePlayerFile(path: string, name: string) {
		const player = this.getPlayerPath();
		const stat = await fse.stat(player);
		if (!stat.isDirectory()) {
			throw new Error(`Path is not directory: ${player}`);
		}

		const playerOut = pathJoin(path, name);
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
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writePlayerArchive(path: string, name: string) {
		const projectorExtensionLower = this.projectorExtension.toLowerCase();
		let playerName = '';

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

			const extractPath = pathJoin(path, name, rel);
			await entry.extract(extractPath);
		});

		if (!playerName) {
			throw new Error(`Failed to locate player in archive: ${player}`);
		}
	}

	/**
	 * Modify the projector player.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _modifyPlayer(path: string, name: string) {
		await this._removeCodeSignature(path, name);
		await this._fixPlayer(path, name);
		await this._writeIcon(path, name);
		await this._writePkgInfo(path, name);
		await this._updateBinaryName(path, name);
		await this._writeInfoPlist(path, name);
		await this._updateInfoPlist(path, name);
	}

	/**
	 * Write out the projector movie file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writeMovie(path: string, name: string) {
		const data = await this.getMovieData();
		if (!data) {
			return;
		}
		const moviePath = this.getMoviePath(name);
		await this._maybeWriteFile(
			data,
			pathJoin(path, moviePath),
			true
		);
	}

	/**
	 * A method to fix some partially broken players.
	 * Currently fixes the icon in some old projectors.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _fixPlayer(path: string, name: string) {
		const {fixBrokenIconPaths} = this;
		if (!fixBrokenIconPaths) {
			return;
		}

		const xmlOriginal = await this._readInfoPlist(path, name);
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
			pathJoin(path, this.getInfoPlistPath(name)),
			true
		);
	}

	/**
	 * Write out the projector icon file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writeIcon(path: string, name: string) {
		const data = await this.getIconData();
		if (!data) {
			return;
		}

		const xml = await this._readInfoPlist(path, name);
		const iconName = this._readInfoPlistIcon(xml);

		await this._maybeWriteFile(
			data,
			pathJoin(path, this.getIconPath(name, iconName)),
			true
		);
	}

	/**
	 * Write out the projector PkgInfo file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writePkgInfo(path: string, name: string) {
		await this._maybeWriteFile(
			await this.getPkgInfoData(),
			pathJoin(path, this.getPkgInfoPath(name)),
			true
		);
	}

	/**
	 * Remove projector code signature if enabled.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _removeCodeSignature(path: string, name: string) {
		if (!this.removeCodeSignature) {
			return;
		}

		// Remove the code signature.
		await macCodesignRemove(
			pathJoin(path, name),
			this.codesignPath
		);

		// Cleanup signature directory that may be left behind.
		await fse.remove(pathJoin(path, name, 'Contents', '_CodeSignature'));
	}

	/**
	 * Update projector binary name.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _updateBinaryName(path: string, name: string) {
		const {
			binaryName,
			appIconNameCustom,
			appRsrcNameCustom
		} = this;

		if (!binaryName && !appIconNameCustom) {
			return;
		}

		const xml = await this._readInfoPlist(path, name);

		if (binaryName) {
			const executableName = this._readInfoPlistExecutable(xml);

			const rsrcPathOld = this.getRsrcPath(name, executableName, true);
			if (!appRsrcNameCustom) {
				throw new Error('Internal error');
			}
			const rsrcPathNew = this.getRsrcPath(name, appRsrcNameCustom);

			const binaryPathOld = this.getBinaryPath(name, executableName);
			const binaryPathNew = this.getBinaryPath(name, binaryName);

			await fse.move(
				pathJoin(path, binaryPathOld),
				pathJoin(path, binaryPathNew)
			);
			await fse.move(
				pathJoin(path, rsrcPathOld),
				pathJoin(path, rsrcPathNew)
			);
		}

		if (appIconNameCustom) {
			const iconName = this._readInfoPlistIcon(xml);
			const iconPathOld = this.getIconPath(name, iconName);
			const iconPathNew = this.getIconPath(name, appIconNameCustom);

			await fse.move(
				pathJoin(path, iconPathOld),
				pathJoin(path, iconPathNew)
			);
		}
	}

	/**
	 * Write out the projector Info.plist file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writeInfoPlist(path: string, name: string) {
		await this._maybeWriteFile(
			await this.getInfoPlistData(),
			pathJoin(path, this.getInfoPlistPath(name)),
			true
		);
	}

	/**
	 * Update the projector Info.plist file fields.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _updateInfoPlist(path: string, name: string) {
		const xmlOriginal = await this._readInfoPlist(path, name);
		const xml = this.updateInfoPlistCode(xmlOriginal, name);

		// Write file if changed.
		if (xml === xmlOriginal) {
			return;
		}
		await this._maybeWriteFile(
			Buffer.from(xml, 'utf8'),
			pathJoin(path, this.getInfoPlistPath(name)),
			true
		);
	}

	/**
	 * Read the projector Info.plist file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 * @returns File data.
	 */
	protected async _readInfoPlist(path: string, name: string) {
		const file = pathJoin(path, this.getInfoPlistPath(name));
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
}

import {
	join as pathJoin
} from 'path';

import {
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';
import {
	signatureGet,
	signatureSet
} from 'portable-executable-signature';
import * as resedit from 'resedit';
import fse from 'fs-extra';

import {
	IProjectorOptions,
	Projector
} from '../projector';
import {
	defaultFalse,
	defaultNull,
	bufferToArrayBuffer
} from '../util';

const ResEditNtExecutable =
	resedit.NtExecutable ||
	(resedit as any).default.NtExecutable;

const ResEditNtExecutableResource =
	resedit.NtExecutableResource ||
	(resedit as any).default.NtExecutableResource;

const ResEditResource =
	resedit.Resource ||
	(resedit as any).default.Resource;

const ResEditData =
	resedit.Data ||
	(resedit as any).default.Data;

export interface IProjectorWindowsOptions extends IProjectorOptions {

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
	iconData?: Readonly<Buffer> | null;

	/**
	 * Version strings.
	 *
	 * @default null
	 */
	fileVersion?: string | null;

	/**
	 * Product version.
	 *
	 * @default null
	 */
	productVersion?: string | null;

	/**
	 * Version strings.
	 *
	 * @default null
	 */
	versionStrings?: Readonly<{[key: string]: string}> | null;

	/**
	 * Remove the code signature.
	 *
	 * @default false
	 */
	removeCodeSignature?: boolean;
}

/**
 * ProjectorWindows constructor.
 *
 * @param options Options object.
 */
export class ProjectorWindows extends Projector {
	/**
	 * Icon file, requires Windows or Wine.
	 *
	 * @default null
	 */
	public iconFile: string | null;

	/**
	 * Icon data.
	 *
	 * @default null
	 */
	public iconData: Readonly<Buffer> | null;

	/**
	 * Version strings, requires Windows or Wine.
	 *
	 * @default null
	 */
	public fileVersion: string | null;

	/**
	 * Product version, requires Windows or Wine.
	 *
	 * @default null
	 */
	public productVersion: string | null;

	/**
	 * Version strings, requires Windows or Wine.
	 *
	 * @default null
	 */
	public versionStrings: Readonly<{[key: string]: string}> | null;

	/**
	 * Remove the code signature.
	 *
	 * @default false
	 */
	public removeCodeSignature: boolean;

	constructor(options: Readonly<IProjectorWindowsOptions> = {}) {
		super(options);

		this.iconFile = defaultNull(options.iconFile);
		this.iconData = defaultNull(options.iconData);
		this.fileVersion = defaultNull(options.fileVersion);
		this.productVersion = defaultNull(options.productVersion);
		this.versionStrings = defaultNull(options.versionStrings);
		this.removeCodeSignature = defaultFalse(options.removeCodeSignature);
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
	 * If icon is specified.
	 *
	 * @returns Is specified.
	 */
	public get hasIcon() {
		return !!(this.iconData || this.iconFile);
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
	 * Get all version strings.
	 *
	 * @returns Verion strings.
	 */
	public getVersionStrings() {
		const {fileVersion, productVersion, versionStrings} = this;
		if (
			fileVersion === null &&
			productVersion === null &&
			versionStrings === null
		) {
			return null;
		}
		const values = {...(versionStrings || {})};
		if (fileVersion !== null) {
			values.FileVersion = fileVersion;
		}
		if (productVersion !== null) {
			values.ProductVersion = productVersion;
		}
		return values;
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
			stat.isFile() &&
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
		if (!stat.isFile()) {
			throw new Error(`Path is not file: ${player}`);
		}

		const playerOut = pathJoin(path, name);
		await fse.copyFile(player, playerOut);
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
		let playerPath = '';

		const player = this.getPlayerPath();
		const playerOut = pathJoin(path, name);

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
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _modifyPlayer(path: string, name: string) {
		await this._removeCodeSignature(path, name);
		await this._updateResources(path, name);
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

		await this._appendMovieData(pathJoin(path, name), data, 'dms');
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

		// Read file and check for signature.
		const file = pathJoin(path, name);
		const exeOriginal = await fse.readFile(file);
		if (!signatureGet(exeOriginal)) {
			return;
		}

		// If signed, remove signature and write.
		await fse.writeFile(file, Buffer.from(
			signatureSet(exeOriginal, null, true, true))
		);
	}

	/**
	 * Update projector Windows resources.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _updateResources(path: string, name: string) {
		const versionStrings = this.getVersionStrings();
		const iconData = await this.getIconData();

		// Skip if nothing to be changed.
		if (!iconData && !versionStrings) {
			return;
		}

		// Read EXE file and remove signature if present.
		const file = pathJoin(path, name);
		const exeOriginal = await fse.readFile(file);
		const signature = signatureGet(exeOriginal);
		let exeData = signatureSet(exeOriginal, null, true, true);

		// Parse resources.
		const exe = ResEditNtExecutable.from(exeData);
		const res = ResEditNtExecutableResource.from(exe);

		// Replace all the icons in all icon groups.
		if (iconData) {
			const ico = ResEditData.IconFile.from(
				bufferToArrayBuffer(iconData)
			);
			for (const iconGroup of ResEditResource.IconGroupEntry.fromEntries(
				res.entries
			)) {
				ResEditResource.IconGroupEntry.replaceIconsForResource(
					res.entries,
					iconGroup.id,
					iconGroup.lang,
					ico.icons.map(icon => icon.data)
				);
			}
		}

		// Update strings if present for all the languages.
		if (versionStrings) {
			for (const versionInfo of ResEditResource.VersionInfo.fromEntries(
				res.entries
			)) {
				// Unfortunately versionInfo.getAvailableLanguages() skips some.
				// Get the full list from the internal data.
				const languages = (versionInfo as any).data.strings
					.map((o: any) => ({
						lang: o.lang as (number | string),
						codepage: o.codepage as (number | string)
					}));

				for (const language of languages) {
					versionInfo.setStringValues(language, versionStrings);
				}
				versionInfo.outputToResourceEntries(res.entries);
			}
		}

		// Update resources.
		res.outputResource(exe);
		exeData = exe.generate();

		// Add back signature if was removed.
		if (signature) {
			exeData = signatureSet(exeData, signature, true, true);
		}

		// Write updated EXE file.
		await fse.writeFile(file, Buffer.from(exeData));
	}
}

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
	Projector
} from '../projector';
import {
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

/**
 * ProjectorWindows constructor.
 *
 * @param path Output path.
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

	constructor(path: string) {
		super(path);
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
	 * Write the projector player.
	 */
	protected async _writePlayer() {
		const player = this.getPlayerPath();
		const stat = await fse.stat(player);
		const projectorExtensionLower = this.projectorExtension.toLowerCase();

		if (
			stat.isFile() &&
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
		if (!stat.isFile()) {
			throw new Error(`Path is not file: ${player}`);
		}

		const {path} = this;
		await fse.copyFile(player, path);
		await fsChmod(path, modePermissionBits(stat.mode));
		await fsUtimes(path, stat.atime, stat.mtime);
	}

	/**
	 * Write the projector player, from archive.
	 */
	protected async _writePlayerArchive() {
		const projectorExtensionLower = this.projectorExtension.toLowerCase();
		let playerPath = '';

		const player = this.getPlayerPath();
		const playerOut = this.path;

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
	 */
	protected async _modifyPlayer() {
		await this._removeCodeSignature();
		await this._updateResources();
	}

	/**
	 * Write out the projector movie file.
	 */
	protected async _writeMovie() {
		const data = await this.getMovieData();
		if (!data) {
			return;
		}

		await this._appendMovieData(this.path, data, 'dms');
	}

	/**
	 * Remove projector code signature if enabled.
	 */
	protected async _removeCodeSignature() {
		if (!this.removeCodeSignature) {
			return;
		}

		// Read file and check for signature.
		const {path} = this;
		const exeOriginal = await fse.readFile(path);
		if (!signatureGet(exeOriginal)) {
			return;
		}

		// If signed, remove signature and write.
		await fse.writeFile(path, Buffer.from(
			signatureSet(exeOriginal, null, true, true))
		);
	}

	/**
	 * Update projector Windows resources.
	 */
	protected async _updateResources() {
		const {versionStrings} = this;
		const iconData = await this.getIconData();

		// Skip if nothing to be changed.
		if (!iconData && !versionStrings) {
			return;
		}

		// Read EXE file and remove signature if present.
		const {path} = this;
		const exeOriginal = await fse.readFile(path);
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
		await fse.writeFile(path, Buffer.from(exeData));
	}
}

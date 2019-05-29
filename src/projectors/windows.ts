import {
	fsChmod,
	fsUtimes,
	modePermissionBits,
	PathType
} from '@shockpkg/archive-files';
import {
	copyFile as fseCopyFile,
	stat as fseStat
} from 'fs-extra';
import {
	join as pathJoin
} from 'path';

import {
	IProjectorOptions,
	Projector
} from '../projector';
import {
	defaultFalse,
	defaultNull
} from '../util';
import {
	IRceditOptions,
	IRceditOptionsVersionStrings,
	windowsRcedit,
	windowsSigntoolUnsign
} from '../utils/windows';

export interface IProjectorWindowsOptions extends IProjectorOptions {
	/**
	 * Icon file, requires Windows or Wine.
	 *
	 * @defaultValue null
	 */
	iconFile?: string | null;

	/**
	 * Version strings, requires Windows or Wine.
	 *
	 * @defaultValue null
	 */
	fileVersion?: string | null;

	/**
	 * Product version, requires Windows or Wine.
	 *
	 * @defaultValue null
	 */
	productVersion?: string | null;

	/**
	 * Version strings, requires Windows or Wine.
	 *
	 * @defaultValue null
	 */
	versionStrings?: IRceditOptionsVersionStrings | null;

	/**
	 * Remove the code signature.
	 *
	 * @defaultValue false
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
	 * @defaultValue null
	 */
	public iconFile: string | null;

	/**
	 * Version strings, requires Windows or Wine.
	 *
	 * @defaultValue null
	 */
	public fileVersion: string | null;

	/**
	 * Product version, requires Windows or Wine.
	 *
	 * @defaultValue null
	 */
	public productVersion: string | null;

	/**
	 * Version strings, requires Windows or Wine.
	 *
	 * @defaultValue null
	 */
	public versionStrings: IRceditOptionsVersionStrings | null;

	/**
	 * Remove the code signature.
	 *
	 * @defaultValue false
	 */
	public removeCodeSignature: boolean;

	constructor(options: IProjectorWindowsOptions) {
		super(options);

		this.iconFile = defaultNull(options.iconFile);
		this.fileVersion = defaultNull(options.fileVersion);
		this.productVersion = defaultNull(options.productVersion);
		this.versionStrings = defaultNull(options.versionStrings);
		this.removeCodeSignature = defaultFalse(options.removeCodeSignature);
	}

	/**
	 * Projector file extension.
	 */
	public get projectorExtension() {
		return '.exe';
	}

	/**
	 * Write the projector player.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writePlayer(path: string, name: string) {
		const player = this.getPlayerPath();
		const stat = await fseStat(player);
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
		const stat = await fseStat(player);
		if (!stat.isFile()) {
			throw new Error(`Path is not file: ${player}`);
		}

		const playerOut = pathJoin(path, name);
		await fseCopyFile(player, playerOut);
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

		await windowsSigntoolUnsign(pathJoin(path, name));
	}

	/**
	 * Update projector Windows resources.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _updateResources(path: string, name: string) {
		// tslint:disable-next-line no-this-assignment
		const {
			iconFile,
			fileVersion,
			productVersion,
			versionStrings
		} = this;

		const options: IRceditOptions = {};
		let optionsSet = false;

		if (iconFile) {
			options.iconPath = iconFile;
			optionsSet = true;
		}

		if (fileVersion !== null) {
			options.fileVersion = fileVersion;
			optionsSet = true;
		}

		if (productVersion !== null) {
			options.productVersion = productVersion;
			optionsSet = true;
		}

		if (versionStrings !== null) {
			options.versionStrings = versionStrings;
			optionsSet = true;
		}

		// Do not update if no changes are specified.
		if (!optionsSet) {
			return;
		}

		const file = pathJoin(path, name);
		await windowsRcedit(file, options);
	}
}

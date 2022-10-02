import {copyFile, mkdir, stat, writeFile} from 'fs/promises';
import {join as pathJoin, basename, dirname} from 'path';

import {fsLstatExists} from '@shockpkg/archive-files';

import {trimExtension} from '../../util';
import {
	plistRead,
	infoPlistBundleExecutableGet,
	infoPlistBundleExecutableSet,
	infoPlistBundleIconFileGet,
	machoTypesFile,
	machoAppLauncher
} from '../../util/mac';
import {ProjectorMacApp} from '../../projector/mac/app';
import {BundleMac} from '../mac';

/**
 * BundleMacApp object.
 */
export class BundleMacApp extends BundleMac {
	/**
	 * ProjectorMacApp instance.
	 */
	public readonly projector: ProjectorMacApp;

	/**
	 * BundleMacApp constructor.
	 *
	 * @param path Output path for the main application.
	 */
	constructor(path: string) {
		super(path);

		this.projector = this._createProjector();
	}

	/**
	 * Main application file extension.
	 *
	 * @returns File extension.
	 */
	public get extension() {
		return '.app';
	}

	/**
	 * Get the launcher name.
	 *
	 * @returns Launcher name.
	 */
	protected _getLauncherName() {
		return trimExtension(basename(this.path), this.extension, true);
	}

	/**
	 * Create projector instance for the bundle.
	 *
	 * @returns Projector instance.
	 */
	protected _createProjector() {
		const projName = `${this._getLauncherName()}${this.extension}`;
		const projPath = pathJoin(this.path, 'Contents', 'Resources', projName);
		return new ProjectorMacApp(projPath);
	}

	/**
	 * Write the launcher file.
	 */
	protected async _writeLauncher() {
		const {path, projector} = this;

		// Create paths to things to create.
		const appContents = pathJoin(path, 'Contents');
		const appMacOS = pathJoin(appContents, 'MacOS');
		const appResources = pathJoin(appContents, 'Resources');
		const appInfoPlist = pathJoin(appContents, 'Info.plist');
		const appPkgInfo = pathJoin(appContents, 'PkgInfo');

		// Read the projector Info.plist.
		const plist = await plistRead(projector.infoPlistPath);

		// Get the binary path and read the types.
		const projBinaryName = infoPlistBundleExecutableGet(plist);
		const projBinaryPath = projector.getBinaryPath(projBinaryName);
		const projBinaryTypes = await machoTypesFile(projBinaryPath);

		// Get the icon path.
		const projIconName = infoPlistBundleIconFileGet(plist);
		const projIconPath = projector.getIconPath(projIconName);

		// Get the PkgInfo path.
		const projPkgInfoPath = projector.pkgInfoPath;

		// Create the launcher binary with the same types and mode.
		const launcherName = this._getLauncherName();
		const launcherPath = pathJoin(appMacOS, launcherName);
		await mkdir(dirname(launcherPath), {recursive: true});
		await writeFile(launcherPath, await machoAppLauncher(projBinaryTypes), {
			mode: (await stat(projBinaryPath)).mode
		});

		// Copy the projector icon if present.
		const pathIcon = pathJoin(appResources, projIconName);
		if (await fsLstatExists(projIconPath)) {
			await copyFile(projIconPath, pathIcon);
		}

		// Copy PkgInfo if present.
		if (await fsLstatExists(projPkgInfoPath)) {
			await copyFile(projPkgInfoPath, appPkgInfo);
		}

		// Update the executable name in the plist for the launcher.
		infoPlistBundleExecutableSet(plist, launcherName);

		// Write the updated Info.plist.
		await mkdir(dirname(appInfoPlist), {recursive: true});
		await writeFile(appInfoPlist, plist.toXml(), 'utf8');
	}
}

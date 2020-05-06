import {
	join as pathJoin,
	basename
} from 'path';

import fse from 'fs-extra';

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
 * BundleMacApp constructor.
 *
 * @param path Output path for the main application.
 */
export class BundleMacApp extends BundleMac {
	/**
	 * ProjectorMacApp instance.
	 */
	public readonly projector: ProjectorMacApp;

	constructor(path: string) {
		super(path);

		this.projector = this._createProjector();
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
		await fse.outputFile(
			launcherPath,
			await machoAppLauncher(projBinaryTypes),
			{
				mode: (await fse.stat(projBinaryPath)).mode
			}
		);

		// Copy the projector icon if present.
		const pathIcon = pathJoin(appResources, projIconName);
		if (await fse.pathExists(projIconPath)) {
			await fse.copyFile(projIconPath, pathIcon);
		}

		// Copy PkgInfo if present.
		if (await fse.pathExists(projPkgInfoPath)) {
			await fse.copyFile(projPkgInfoPath, appPkgInfo);
		}

		// Update the executable name in the plist for the launcher.
		infoPlistBundleExecutableSet(plist, launcherName);

		// Write the updated Info.plist.
		await fse.outputFile(appInfoPlist, plist.toXml(), 'utf8');
	}
}

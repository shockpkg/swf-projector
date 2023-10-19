import {copyFile, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {join as pathJoin, basename, dirname} from 'node:path';

import {fsLstatExists} from '@shockpkg/archive-files';
import {Plist, ValueDict, ValueString} from '@shockpkg/plist-dom';

import {trimExtension} from '../../util';
import {machoTypesFile, machoAppLauncher} from '../../util/mac';
import {ProjectorSaMac} from '../../projector/sa/mac';
import {BundleSa} from '../sa';

/**
 * BundleSaMac object.
 */
export class BundleSaMac extends BundleSa {
	/**
	 * ProjectorSaMac instance.
	 */
	public readonly projector: ProjectorSaMac;

	/**
	 * BundleSaMac constructor.
	 *
	 * @param path Output path for the main application.
	 * @param flat Flat bundle.
	 */
	constructor(path: string, flat = false) {
		super(path, flat);

		this.projector = this._createProjector();
	}

	/**
	 * @inheritdoc
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
	 * @inheritdoc
	 */
	protected _getProjectorPathNested(): string {
		const projName = `${this._getLauncherName()}${this.extension}`;
		return pathJoin(this.path, 'Contents', 'Resources', projName);
	}

	/**
	 * @inheritdoc
	 */
	protected _createProjector() {
		return new ProjectorSaMac(this._getProjectorPath());
	}

	/**
	 * @inheritdoc
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
		const plist = new Plist();
		plist.fromXml(await readFile(projector.infoPlistPath, 'utf8'));
		const dict = plist.getValue().castAs(ValueDict);

		// Get the binary path and read the types.
		const projBinaryName = dict
			.getValue('CFBundleExecutable')
			.castAs(ValueString).value;
		const projBinaryPath = projector.getBinaryPath(projBinaryName);
		const projBinaryTypes = await machoTypesFile(projBinaryPath);

		// Get the icon path.
		const projIconName = dict
			.getValue('CFBundleIconFile')
			.castAs(ValueString).value;
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
		dict.set('CFBundleExecutable', new ValueString(launcherName));

		// Write the updated Info.plist.
		await mkdir(dirname(appInfoPlist), {recursive: true});
		await writeFile(appInfoPlist, plist.toXml(), 'utf8');
	}
}

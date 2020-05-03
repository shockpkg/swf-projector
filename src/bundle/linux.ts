import fse from 'fs-extra';

import {linuxScriptLauncher} from '../util/linux';
import {ProjectorLinux} from '../projector/linux';
import {Bundle} from '../bundle';

/**
 * BundleLinux constructor.
 *
 * @param path Output path for the main application.
 */
export abstract class BundleLinux extends Bundle {
	/**
	 * Suffix for resource directory.
	 */
	public resourceSuffix = '.data';

	/**
	 * ProjectorLinux instance.
	 */
	public abstract readonly projector: ProjectorLinux;

	constructor(path: string) {
		super(path);
	}

	/**
	 * Main application file extension.
	 *
	 * @returns File extension.
	 */
	public get extension() {
		return '';
	}

	/**
	 * Write the launcher file.
	 */
	protected async _writeLauncher() {
		// Create launcher script with same mode.
		await fse.outputFile(
			this.path,
			await linuxScriptLauncher(this.resourceSuffix),
			{
				mode: (await fse.stat(this.projector.path)).mode
			}
		);
	}
}

import {join as pathJoin, basename} from 'path';

import fse from 'fs-extra';

import {linuxLauncher} from '../../util/linux';
import {ProjectorLinux32} from '../../projector/linux/32';
import {BundleLinux} from '../linux';

/**
 * BundleLinux32 object.
 */
export class BundleLinux32 extends BundleLinux {
	/**
	 * ProjectorLinux32 instance.
	 */
	public readonly projector: ProjectorLinux32;

	/**
	 * BundleLinux32 constructor.
	 *
	 * @param path Output path for the main application.
	 */
	constructor(path: string) {
		super(path);

		this.projector = this._createProjector();
	}

	/**
	 * Create projector instance for the bundle.
	 *
	 * @returns Projector instance.
	 */
	protected _createProjector() {
		const {path} = this;
		return new ProjectorLinux32(pathJoin(`${path}.data`, basename(path)));
	}

	/**
	 * Write the launcher file.
	 */
	protected async _writeLauncher() {
		// Create launcher script with same mode.
		await fse.outputFile(this.path, await linuxLauncher('i386'), {
			mode: (await fse.stat(this.projector.path)).mode
		});
	}
}

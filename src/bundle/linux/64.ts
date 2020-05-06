import {
	join as pathJoin,
	basename
} from 'path';

import fse from 'fs-extra';

import {linuxLauncher} from '../../util/linux';
import {ProjectorLinux64} from '../../projector/linux/64';
import {BundleLinux} from '../linux';

/**
 * BundleLinux64 constructor.
 *
 * @param path Output path for the main application.
 */
export class BundleLinux64 extends BundleLinux {
	/**
	 * ProjectorLinux64 instance.
	 */
	public readonly projector: ProjectorLinux64;

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
		return new ProjectorLinux64(pathJoin(`${path}.data`, basename(path)));
	}

	/**
	 * Write the launcher file.
	 */
	protected async _writeLauncher() {
		// Create launcher script with same mode.
		await fse.outputFile(
			this.path,
			await linuxLauncher('x86_64'),
			{
				mode: (await fse.stat(this.projector.path)).mode
			}
		);
	}
}

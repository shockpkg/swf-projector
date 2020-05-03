import {
	join as pathJoin,
	basename
} from 'path';

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
		const {path, resourceSuffix} = this;
		if (!resourceSuffix) {
			throw new Error('Resource directory suffix cannot be empty');
		}
		const directory = `${path}${resourceSuffix}`;
		return new ProjectorLinux64(pathJoin(directory, basename(path)));
	}
}

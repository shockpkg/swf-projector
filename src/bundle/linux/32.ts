import {
	join as pathJoin,
	basename
} from 'path';

import {ProjectorLinux32} from '../../projector/linux/32';
import {BundleLinux} from '../linux';

/**
 * BundleLinux32 constructor.
 *
 * @param path Output path for the main application.
 */
export class BundleLinux32 extends BundleLinux {
	/**
	 * ProjectorLinux32 instance.
	 */
	public readonly projector: ProjectorLinux32;

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
		return new ProjectorLinux32(pathJoin(directory, basename(path)));
	}
}

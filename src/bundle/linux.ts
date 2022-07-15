import {ProjectorLinux} from '../projector/linux';
import {Bundle} from '../bundle';

/**
 * BundleLinux object.
 */
export abstract class BundleLinux extends Bundle {
	/**
	 * ProjectorLinux instance.
	 */
	public abstract readonly projector: ProjectorLinux;

	/**
	 * BundleLinux constructor.
	 *
	 * @param path Output path for the main application.
	 */
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
}

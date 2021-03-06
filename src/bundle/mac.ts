import {ProjectorMac} from '../projector/mac';
import {Bundle} from '../bundle';

/**
 * BundleMac constructor.
 *
 * @param path Output path for the main application.
 */
export abstract class BundleMac extends Bundle {
	/**
	 * ProjectorMac instance.
	 */
	public abstract readonly projector: ProjectorMac;

	constructor(path: string) {
		super(path);
	}

	/**
	 * Main application file extension.
	 *
	 * @returns File extension.
	 */
	public get extension() {
		return '.app';
	}
}

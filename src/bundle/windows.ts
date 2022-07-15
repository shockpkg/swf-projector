import {ProjectorWindows} from '../projector/windows';
import {Bundle} from '../bundle';

/**
 * BundleWindows object.
 */
export abstract class BundleWindows extends Bundle {
	/**
	 * ProjectorWindows instance.
	 */
	public abstract readonly projector: ProjectorWindows;

	/**
	 * BundleWindows constructor.
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
		return '.exe';
	}
}

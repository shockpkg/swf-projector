import {ProjectorSa} from '../projector/sa.ts';
import {Bundle} from '../bundle.ts';

/**
 * BundleSa object.
 */
export abstract class BundleSa extends Bundle {
	/**
	 * ProjectorSa instance.
	 */
	public abstract readonly projector: ProjectorSa;

	/**
	 * BundleSa constructor.
	 *
	 * @param path Output path.
	 * @param flat Flat bundle.
	 */
	constructor(path: string, flat = false) {
		super(path, flat);
	}

	/**
	 * @inheritdoc
	 */
	protected async _close(): Promise<void> {
		if (!this.flat) {
			await this._writeLauncher();
		}
		await super._close();
	}

	/**
	 * Main application file extension.
	 *
	 * @returns File extension.
	 */
	public abstract get extension(): string;

	/**
	 * Create projector instance for the bundle.
	 *
	 * @returns Projector instance.
	 */
	protected abstract _createProjector(): ProjectorSa;

	/**
	 * Write the launcher file.
	 */
	protected abstract _writeLauncher(): Promise<void>;
}

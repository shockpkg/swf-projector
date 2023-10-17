import {ProjectorSa} from '../projector/sa';
import {Bundle} from '../bundle';

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
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * @inheritdoc
	 */
	protected async _close(): Promise<void> {
		await this._writeLauncher();
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

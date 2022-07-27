import {mkdir, writeFile} from 'fs/promises';
import {join as pathJoin, basename, dirname} from 'path';

import {trimExtension} from '../../util';
import {windowsLauncher} from '../../util/windows';
import {ProjectorWindows32} from '../../projector/windows/32';
import {BundleWindows} from '../windows';

/**
 * BundleWindows32 object.
 */
export class BundleWindows32 extends BundleWindows {
	/**
	 * ProjectorWindows32 instance.
	 */
	public readonly projector: ProjectorWindows32;

	/**
	 * BundleWindows32 constructor.
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
		const {path, extension} = this;
		const directory = trimExtension(path, extension, true);
		if (directory === path) {
			throw new Error(`Output path must end with: ${extension}`);
		}
		return new ProjectorWindows32(pathJoin(directory, basename(path)));
	}

	/**
	 * Write the launcher file.
	 */
	protected async _writeLauncher() {
		const {path, projector} = this;
		await mkdir(dirname(path), {recursive: true});
		await writeFile(path, await windowsLauncher('i686', projector.path));
	}
}

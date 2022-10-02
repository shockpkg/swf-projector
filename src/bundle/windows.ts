import {mkdir, open, writeFile} from 'fs/promises';
import {join as pathJoin, basename, dirname} from 'path';

import {trimExtension} from '../util';
import {windowsLauncher} from '../util/windows';
import {Bundle} from '../bundle';
import {ProjectorWindows} from '../projector/windows';

/**
 * BundleWindows object.
 */
export class BundleWindows extends Bundle {
	/**
	 * ProjectorWindows instance.
	 */
	public readonly projector: ProjectorWindows;

	/**
	 * BundleWindows constructor.
	 *
	 * @param path Output path for the main application.
	 */
	constructor(path: string) {
		super(path);

		this.projector = this._createProjector();
	}

	/**
	 * Main application file extension.
	 *
	 * @returns File extension.
	 */
	public get extension() {
		return '.exe';
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
		return new ProjectorWindows(pathJoin(directory, basename(path)));
	}

	/**
	 * Write the launcher file.
	 */
	protected async _writeLauncher() {
		const {path, projector} = this;

		const data = Buffer.alloc(4);
		const f = await open(projector.path, 'r');
		try {
			await f.read(data, 0, 4, 60);
			await f.read(data, 0, 2, data.readUInt32LE() + 4);
		} finally {
			await f.close();
		}

		const machine = data.readUInt16LE();
		let launcher = null;
		switch (machine) {
			case 0x14c: {
				launcher = await windowsLauncher('i686', projector.path);
				break;
			}
			case 0x8664: {
				launcher = await windowsLauncher('x86_64', projector.path);
				break;
			}
			default: {
				throw new Error(`Unknown machine type: ${machine}`);
			}
		}

		await mkdir(dirname(path), {recursive: true});
		await writeFile(path, launcher);
	}
}

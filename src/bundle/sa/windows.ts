import {mkdir, open, writeFile} from 'node:fs/promises';
import {join as pathJoin, basename, dirname} from 'node:path';

import {trimExtension} from '../../util';
import {windowsLauncher} from '../../util/windows';
import {ProjectorSaWindows} from '../../projector/sa/windows';
import {BundleSa} from '../sa';

/**
 * BundleSaWindows object.
 */
export class BundleSaWindows extends BundleSa {
	/**
	 * ProjectorSaWindows instance.
	 */
	public readonly projector: ProjectorSaWindows;

	/**
	 * BundleSaWindows constructor.
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
		return new ProjectorSaWindows(pathJoin(directory, basename(path)));
	}

	/**
	 * Write the launcher file.
	 */
	protected async _writeLauncher() {
		const {path, projector} = this;

		const d = new Uint8Array(4);
		const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
		const f = await open(projector.path, 'r');
		try {
			let r = await f.read(d, 0, 4, 60);
			if (r.bytesRead < 4) {
				throw new Error('Unknown format');
			}
			r = await f.read(d, 0, 2, v.getUint32(0, true) + 4);
			if (r.bytesRead < 2) {
				throw new Error('Unknown format');
			}
		} finally {
			await f.close();
		}

		const machine = v.getUint16(0, true);
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

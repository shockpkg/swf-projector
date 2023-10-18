import {mkdir, open, writeFile} from 'node:fs/promises';
import {join as pathJoin, basename, dirname} from 'node:path';

import {linuxLauncher} from '../../util/linux';
import {EM_386, EM_X86_64} from '../../util/internal/linux/elf';
import {ProjectorSaLinux} from '../../projector/sa/linux';
import {BundleSa} from '../sa';

/**
 * BundleSaLinux object.
 */
export class BundleSaLinux extends BundleSa {
	/**
	 * ProjectorSaLinux instance.
	 */
	public readonly projector: ProjectorSaLinux;

	/**
	 * BundleSaLinux constructor.
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
		return '';
	}

	/**
	 * Create projector instance for the bundle.
	 *
	 * @returns Projector instance.
	 */
	protected _createProjector() {
		const {path} = this;
		return new ProjectorSaLinux(pathJoin(`${path}.data`, basename(path)));
	}

	/**
	 * Write the launcher file.
	 */
	protected async _writeLauncher() {
		const {path, projector} = this;

		let stat = null;
		const d = new Uint8Array(2);
		const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
		const f = await open(projector.path, 'r');
		try {
			stat = await f.stat();
			await f.read(d, 0, 2, 18);
		} finally {
			await f.close();
		}

		const machine = v.getUint16(0, true);
		let launcher = null;
		switch (machine) {
			case EM_386: {
				launcher = await linuxLauncher('i386');
				break;
			}
			case EM_X86_64: {
				launcher = await linuxLauncher('x86_64');
				break;
			}
			default: {
				throw new Error(`Unknown machine type: ${machine}`);
			}
		}

		await mkdir(dirname(path), {recursive: true});
		await writeFile(path, launcher, {
			mode: stat.mode
		});
	}
}

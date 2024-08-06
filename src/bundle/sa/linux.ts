import {mkdir, open, writeFile} from 'node:fs/promises';
import {join as pathJoin, basename, dirname} from 'node:path';

import {linuxLauncher} from '../../util/linux.ts';
import {EM_386, EM_X86_64} from '../../util/internal/linux/elf.ts';
import {ProjectorSaLinux} from '../../projector/sa/linux.ts';
import {BundleSa} from '../sa.ts';

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
	 * @param flat Flat bundle.
	 */
	constructor(path: string, flat = false) {
		super(path, flat);

		this.projector = this._createProjector();
	}

	/**
	 * @inheritdoc
	 */
	public get extension() {
		return '';
	}

	/**
	 * @inheritdoc
	 */
	protected _getProjectorPathNested(): string {
		const {path} = this;
		return pathJoin(`${path}.data`, basename(path));
	}

	/**
	 * @inheritdoc
	 */
	protected _createProjector() {
		return new ProjectorSaLinux(this._getProjectorPath());
	}

	/**
	 * @inheritdoc
	 */
	protected async _writeLauncher() {
		const {path, projector} = this;

		let stat = null;
		const d = new Uint8Array(2);
		const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
		const f = await open(projector.path, 'r');
		try {
			stat = await f.stat();
			const r = await f.read(d, 0, 2, 18);
			if (r.bytesRead < 2) {
				throw new Error('Unknown format');
			}
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

import fse from 'fs-extra';

import {
	linuxPatchWindowTitle,
	linuxPatchMenuRemoveData,
	linuxPatchProjectorPathData
} from '../../util/linux';
import {ProjectorLinux} from '../linux';

/**
 * ProjectorLinux32 object.
 */
export class ProjectorLinux32 extends ProjectorLinux {
	/**
	 * Attempt to patch the window title with a custom title.
	 * Set to a non-empty string to automatically patch the binary if possible.
	 * Size limit depends on the size of the string being replaced.
	 */
	public patchWindowTitle: string | null = null;

	/**
	 * Attempt to patch out application menu.
	 * Set to true to automatically patch the code if possible.
	 */
	public patchMenuRemove = false;

	/**
	 * Attempt to patch the projector path reading code.
	 * Necessary to work around broken projector path resolving code.
	 * Set to true to automatically patch the code if possible.
	 * Supports projector versions 9+ (unnecessary for version 6).
	 */
	public patchProjectorPath = false;

	/**
	 * ProjectorLinux32 constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * Modify the projector player.
	 */
	protected async _modifyPlayer() {
		const {patchWindowTitle, patchMenuRemove, patchProjectorPath} = this;

		// Skip if no patching was requested.
		if (!(patchWindowTitle || patchMenuRemove || patchProjectorPath)) {
			return;
		}

		// Read the projector file.
		const {path} = this;
		let data = await fse.readFile(path);

		// Attempt to patch the projector data.
		if (patchWindowTitle) {
			data = linuxPatchWindowTitle(data, patchWindowTitle);
		}
		if (patchMenuRemove) {
			data = linuxPatchMenuRemoveData(data);
		}
		if (patchProjectorPath) {
			data = linuxPatchProjectorPathData(data);
		}

		// Write out patched data.
		await fse.writeFile(path, data);
	}

	/**
	 * Write out the projector movie file.
	 *
	 * @param movieData Movie data or null.
	 */
	protected async _writeMovie(movieData: Readonly<Buffer> | null) {
		if (!movieData) {
			return;
		}

		await this._appendMovieData(this.path, movieData, 'smd');
	}
}

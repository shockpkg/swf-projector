import {readFile, writeFile} from 'fs/promises';

import {
	linux32PatchProjectorPathData,
	linuxProjectorPatch
} from '../../util/linux';
import {ProjectorLinux} from '../linux';

/**
 * ProjectorLinux32 object.
 */
export class ProjectorLinux32 extends ProjectorLinux {
	/**
	 * Attempt to patch the window title with a custom title.
	 * Set to a string to automatically patch the binary if possible.
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
		if (
			!(
				patchWindowTitle !== null ||
				patchMenuRemove ||
				patchProjectorPath
			)
		) {
			return;
		}

		// Read the projector file.
		const {path} = this;
		let data = await readFile(path);

		// Attempt to patch the projector data.
		data = linuxProjectorPatch(data, {
			patchWindowTitle,
			patchMenuRemove
		});

		// TODO: Integrate into patch function.
		if (patchProjectorPath) {
			data = linux32PatchProjectorPathData(data);
		}

		// Write out patched data.
		await writeFile(path, data);
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

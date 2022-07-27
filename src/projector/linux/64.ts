import {readFile, writeFile} from 'fs/promises';

import {
	linux64PatchWindowTitle,
	linux64PatchMenuRemoveData,
	linux64PatchProjectorOffsetData,
	linux64PatchProjectorPathData
} from '../../util/linux';
import {ProjectorLinux} from '../linux';

/**
 * ProjectorLinux64 object.
 */
export class ProjectorLinux64 extends ProjectorLinux {
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
	 * Attempt to patch the projector offset reading code.
	 * Necessary to work around broken projector logic in standalone players.
	 * Set to true to automatically patch the code if possible.
	 */
	public patchProjectorOffset = false;

	/**
	 * ProjectorLinux64 constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * The movie appended marker.
	 *
	 * @returns Hex string.
	 */
	public get movieAppendMarker() {
		return `${super.movieAppendMarker}FFFFFFFF`;
	}

	/**
	 * Modify the projector player.
	 */
	protected async _modifyPlayer() {
		const {
			patchWindowTitle,
			patchMenuRemove,
			patchProjectorPath,
			patchProjectorOffset
		} = this;

		// Skip if no patching was requested.
		if (
			!(
				patchWindowTitle ||
				patchMenuRemove ||
				patchProjectorPath ||
				patchProjectorOffset
			)
		) {
			return;
		}

		// Read the projector file.
		const {path} = this;
		let data = await readFile(path);

		// Attempt to patch the projector data.
		if (patchWindowTitle) {
			data = linux64PatchWindowTitle(data, patchWindowTitle);
		}
		if (patchMenuRemove) {
			data = linux64PatchMenuRemoveData(data);
		}
		if (patchProjectorPath) {
			data = linux64PatchProjectorPathData(data);
		}
		if (patchProjectorOffset) {
			data = linux64PatchProjectorOffsetData(data);
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

		await this._appendMovieData(this.path, movieData, 'lmd');
	}
}

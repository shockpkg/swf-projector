import {readFile, writeFile} from 'fs/promises';

import {ProjectorWindows} from '../windows';
import {windowsPatchWindowTitle} from '../../util/windows';

/**
 * ProjectorWindows64 object.
 */
export class ProjectorWindows64 extends ProjectorWindows {
	/**
	 * Attempt to patch the window title with a custom title.
	 * Set to a non-empty string to automatically patch the binary if possible.
	 * There is a size limit if the title is stored in the .rdata section.
	 * That size limit depends on the size of the string being replaced.
	 */
	public patchWindowTitle: string | null = null;

	/**
	 * ProjectorWindows64 constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
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

		await this._appendMovieData(this.path, movieData, 'dms');
	}

	/**
	 * Modify the projector player.
	 */
	protected async _modifyPlayer() {
		await super._modifyPlayer();

		const {patchWindowTitle} = this;
		if (!patchWindowTitle) {
			return;
		}

		await writeFile(
			this.path,
			windowsPatchWindowTitle(await readFile(this.path), patchWindowTitle)
		);
	}
}

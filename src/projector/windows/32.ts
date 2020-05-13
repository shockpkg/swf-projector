import fse from 'fs-extra';

import {
	ProjectorWindows
} from '../windows';
import {
	windowsPatchWindowTitle
} from '../../util/windows';

/**
 * ProjectorWindows32 constructor.
 *
 * @param path Output path.
 */
export class ProjectorWindows32 extends ProjectorWindows {
	/**
	 * Attempt to patch the window title with a custom title.
	 * Set to a non-empty string to automatically patch the binary if possible.
	 * There is a size limit if the title is stored in the .rdata section.
	 * That size limit depends on the size of the string being replaced.
	 */
	public patchWindowTitle: string | null = null;

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

		await fse.writeFile(
			this.path,
			windowsPatchWindowTitle(
				await fse.readFile(this.path),
				patchWindowTitle
			)
		);
	}
}

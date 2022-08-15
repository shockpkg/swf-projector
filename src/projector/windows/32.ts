import {readFile, writeFile} from 'fs/promises';

import {ProjectorWindows} from '../windows';
import {windowsProjectorPatch} from '../../util/windows';

/**
 * ProjectorWindows32 object.
 */
export class ProjectorWindows32 extends ProjectorWindows {
	/**
	 * Attempt to patch the window title with a custom title.
	 * Set to string to automatically patch the binary if possible.
	 */
	public patchWindowTitle: string | null = null;

	/**
	 * Disable the out-of-date check introduced in version 30.
	 * Important since version 35 where there are 90 and 180 day defaults.
	 */
	public patchOutOfDateDisable = false;

	/**
	 * ProjectorWindows32 constructor.
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
		const {
			path,
			versionStrings,
			removeCodeSignature,
			patchWindowTitle,
			patchOutOfDateDisable
		} = this;
		const iconData = await this.getIconData();
		if (
			!(
				iconData ||
				versionStrings ||
				removeCodeSignature ||
				patchWindowTitle ||
				patchOutOfDateDisable
			)
		) {
			return;
		}

		await writeFile(
			path,
			windowsProjectorPatch(await readFile(path), {
				iconData,
				versionStrings,
				removeCodeSignature,
				patchWindowTitle,
				patchOutOfDateDisable
			})
		);
	}
}

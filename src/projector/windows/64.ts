import {readFile, writeFile} from 'fs/promises';

import {ProjectorWindows} from '../windows';
import {windowsProjectorPatch} from '../../util/windows';

/**
 * ProjectorWindows64 object.
 */
export class ProjectorWindows64 extends ProjectorWindows {
	/**
	 * Icon file.
	 */
	public iconFile: string | null = null;

	/**
	 * Icon data.
	 */
	public iconData: Readonly<Buffer> | null = null;

	/**
	 * Version strings.
	 */
	public versionStrings: Readonly<{[key: string]: string}> | null = null;

	/**
	 * Remove the code signature.
	 */
	public removeCodeSignature = false;

	/**
	 * Attempt to patch the window title with a custom title.
	 * Set to a non-empty string to automatically patch the binary if possible.
	 * There is a size limit if the title is stored in the .rdata section.
	 * That size limit depends on the size of the string being replaced.
	 */
	public patchWindowTitle: string | null = null;

	/**
	 * Disable the out-of-date check introduced in version 30.
	 * Important since version 35 where there are 90 and 180 day defaults.
	 */
	public patchOutOfDateDisable = false;

	/**
	 * ProjectorWindows64 constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * Get icon data if any specified, from data or file.
	 *
	 * @returns Icon data or null.
	 */
	public async getIconData() {
		const {iconData, iconFile} = this;
		return iconData || (iconFile ? readFile(iconFile) : null);
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

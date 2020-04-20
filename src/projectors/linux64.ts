import fse from 'fs-extra';

import {
	linux64PatchWindowTitle,
	linux64PatchMenuRemoveData,
	linux64PatchProjectorOffsetData,
	linux64PatchProjectorPathData
} from '../utils/linux';

import {
	ProjectorLinux
} from './linux';

/**
 * ProjectorLinux64 constructor.
 *
 * @param path Output path.
 */
export class ProjectorLinux64 extends ProjectorLinux {
	/**
	 * Attempt to patch the projector offset reading code.
	 * Necessary to work around broken projector logic in standalone players.
	 * Set to true to automaticly patch the code if possible.
	 */
	public patchProjectorOffset = false;

	constructor(path: string) {
		super(path);
	}

	/**
	 * The movie appended marker.
	 *
	 * @returns Hex string.
	 */
	public get movieAppendMarker() {
		return '563412FAFFFFFFFF';
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
		if (!(
			patchWindowTitle ||
			patchMenuRemove ||
			patchProjectorPath ||
			patchProjectorOffset
		)) {
			return;
		}

		// Read the projector file.
		const {path} = this;
		let data = await fse.readFile(path);

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
		await fse.writeFile(path, data);
	}

	/**
	 * Write out the projector movie file.
	 */
	protected async _writeMovie() {
		const data = await this.getMovieData();
		if (!data) {
			return;
		}

		await this._appendMovieData(this.path, data, 'lmd');
	}
}

import {
	join as pathJoin
} from 'path';

import fse from 'fs-extra';

import {
	defaultFalse
} from '../util';
import {
	linux64PatchProjectorOffsetData
} from '../utils/linux';

import {
	IProjectorLinuxOptions,
	ProjectorLinux
} from './linux';

export interface IProjectorLinux64Options extends IProjectorLinuxOptions {

	/**
	 * Attempt to patch the projector offset reading code.
	 * Necessary to work around broken projector logic in standalone players.
	 * Set to true to automaticly patch the code if possible.
	 *
	 * @default false
	 */
	patchProjectorOffset?: boolean;
}

/**
 * ProjectorLinux64 constructor.
 *
 * @param options Options object.
 */
export class ProjectorLinux64 extends ProjectorLinux {
	/**
	 * Attempt to patch the projector offset reading code.
	 * Necessary to work around broken projector logic in standalone players.
	 * Set to true to automaticly patch the code if possible.
	 *
	 * @default false
	 */
	public patchProjectorOffset: boolean;

	constructor(options: Readonly<IProjectorLinux64Options> = {}) {
		super(options);

		this.patchProjectorOffset = defaultFalse(options.patchProjectorOffset);
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
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _modifyPlayer(path: string, name: string) {
		const {patchProjectorOffset} = this;

		// Skip if no patching was requested.
		if (!patchProjectorOffset) {
			return;
		}

		// Read the projector file.
		const projectorPath = pathJoin(path, name);
		let data = await fse.readFile(projectorPath);

		// Attempt to patch the projector data.
		data = linux64PatchProjectorOffsetData(data);

		// Write out patched data.
		await fse.writeFile(projectorPath, data);
	}

	/**
	 * Write out the projector movie file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writeMovie(path: string, name: string) {
		const data = await this.getMovieData();
		if (!data) {
			return;
		}

		await this._appendMovieData(pathJoin(path, name), data, 'lmd');
	}
}

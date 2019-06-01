import {
	join as pathJoin
} from 'path';

import {
	defaultFalse
} from '../util';
import {
	linux64PatchProjectorOffset
} from '../utils/linux';

import {
	IProjectorLinuxOptions,
	ProjectorLinux
} from './linux';

// tslint:disable-next-line no-empty-interface
export interface IProjectorLinux64Options extends IProjectorLinuxOptions {
	/**
	 * Attempt to patch the projector offset reading code.
	 * Necessary to work around broken projector logic in standalone players.
	 * Set to true to automaticly patch the code if possible.
	 *
	 * @defaultValue false
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
	 * @defaultValue false
	 */
	public patchProjectorOffset: boolean;

	constructor(options: IProjectorLinux64Options = {}) {
		super(options);

		this.patchProjectorOffset = defaultFalse(options.patchProjectorOffset);
	}

	/**
	 * The movie appended marker.
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
		// tslint:disable-next-line no-this-assignment
		const {patchProjectorOffset} = this;

		// Skip if no patching was requested.
		if (!patchProjectorOffset) {
			return;
		}

		// Attempt to patch the projector offset.
		const projectorPath = pathJoin(path, name);
		await linux64PatchProjectorOffset(projectorPath);
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

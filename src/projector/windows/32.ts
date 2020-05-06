import {
	ProjectorWindows
} from '../windows';

/**
 * ProjectorWindows32 constructor.
 *
 * @param path Output path.
 */
export class ProjectorWindows32 extends ProjectorWindows {
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
}

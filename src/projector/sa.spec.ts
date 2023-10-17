import {mkdir, copyFile, readFile, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

import {ProjectorSa} from './sa';

export class ProjectorSaDummy extends ProjectorSa {
	constructor(path: string) {
		super(path);
	}

	public get extension(): string {
		return '.exe';
	}

	protected async _writePlayer(player: string) {
		await mkdir(dirname(this.path), {recursive: true});
		await copyFile(player, this.path);
	}

	protected async _modifyPlayer(movieData: Readonly<Buffer> | null) {
		if (movieData) {
			await writeFile(
				this.path,
				Buffer.concat([
					await readFile(this.path),
					this._encodeMovieData(movieData, 'dms')
				])
			);
		}
	}
}

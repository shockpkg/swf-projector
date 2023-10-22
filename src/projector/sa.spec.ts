import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

import {concat} from '../util/internal/data';

import {ProjectorSa} from './sa';

export class ProjectorSaDummy extends ProjectorSa {
	constructor(path: string) {
		super(path);
	}

	public get extension(): string {
		return '.exe';
	}

	protected async _writePlayer(player: string) {
		let data: Uint8Array = await readFile(player);
		const movieData = await this.getMovieData();
		if (movieData) {
			data = concat([data, this._encodeMovieData(movieData, 'dms')]);
		}
		await mkdir(dirname(this.path), {recursive: true});
		await writeFile(this.path, data);
	}
}

import {rm, mkdir, copyFile, readFile, writeFile} from 'node:fs/promises';
import {join as pathJoin, dirname} from 'node:path';

import {Projector} from './projector';

export const specProjectorsPath = pathJoin('spec', 'projectors');

export async function cleanProjectorDir(...path: string[]) {
	const dir = pathJoin(specProjectorsPath, ...path);
	await rm(dir, {recursive: true, force: true});
	await mkdir(dir, {recursive: true});
	return dir;
}

export class ProjectorDummy extends Projector {
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

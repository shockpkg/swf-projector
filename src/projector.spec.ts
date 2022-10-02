import {rm, mkdir, copyFile, readFile, writeFile} from 'fs/promises';
import {join as pathJoin, dirname} from 'path';

import {fixtureFile} from './util.spec';
import {Projector} from './projector';

export const specProjectorsPath = pathJoin('spec', 'projectors');

export async function cleanProjectorDir(...path: string[]) {
	const dir = pathJoin(specProjectorsPath, ...path);
	await rm(dir, {recursive: true, force: true});
	await mkdir(dir, {recursive: true});
	return dir;
}

const getDir = async (d: string) => cleanProjectorDir('dummy', d);

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

describe('projector', () => {
	describe('ProjectorDummy', () => {
		it('simple', async () => {
			const dir = await getDir('simple');
			const dest = pathJoin(dir, 'application.exe');

			const p = new ProjectorDummy(dest);
			await p.withFile(fixtureFile('dummy.exe'), fixtureFile('swf3.swf'));
		});
	});
});

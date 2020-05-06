import {
	join as pathJoin,
	dirname
} from 'path';

import fse from 'fs-extra';

import {fixtureFile} from './util.spec';
import {Projector} from './projector';

export const specProjectorsPath = pathJoin('spec', 'projectors');

export async function cleanProjectorDir(...path: string[]) {
	const dir = pathJoin(specProjectorsPath, ...path);
	await fse.remove(dir);
	await fse.ensureDir(dir);
	return dir;
}

const getDir = async (d: string) =>
	cleanProjectorDir('dummy', d);

export class ProjectorDummy extends Projector {
	constructor(path: string) {
		super(path);
	}

	public get extension(): string {
		return '.exe';
	}

	protected async _writePlayer(player: string) {
		await fse.ensureDir(dirname(this.path));
		await fse.copyFile(player, this.path);
	}

	protected async _modifyPlayer() {
		// Do nothing.
	}

	protected async _writeMovie(movieData: Readonly<Buffer> | null) {
		if (!movieData) {
			return;
		}

		await this._appendMovieData(this.path, movieData, 'dms');
	}
}

describe('projector', () => {
	describe('ProjectorDummy', () => {
		it('simple', async () => {
			const dir = await getDir('simple');
			const dest = pathJoin(dir, 'application.exe');

			const p = new ProjectorDummy(dest);
			await p.withFile(
				fixtureFile('dummy.exe'),
				fixtureFile('swf3.swf')
			);
		});
	});
});

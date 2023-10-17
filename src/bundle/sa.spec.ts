import {mkdir, writeFile} from 'node:fs/promises';
import {join as pathJoin, basename, dirname} from 'node:path';

import {trimExtension} from '../util';
import {ProjectorSaDummy} from '../projector/sa.spec';

import {BundleSa} from './sa';

export class BundleSaDummy extends BundleSa {
	public readonly projector: ProjectorSaDummy;

	constructor(path: string) {
		super(path);

		this.projector = this._createProjector();
	}

	public get extension() {
		return '.exe';
	}

	protected _createProjector() {
		const {path, extension} = this;
		const directory = trimExtension(path, extension, true);
		if (directory === path) {
			throw new Error(`Output path must end with: ${extension}`);
		}
		return new ProjectorSaDummy(pathJoin(directory, basename(path)));
	}

	protected async _writeLauncher() {
		await mkdir(dirname(this.path), {recursive: true});
		await writeFile(this.path, 'DUMMY_PE_LAUNCHER_EXE\n', 'utf8');
	}
}
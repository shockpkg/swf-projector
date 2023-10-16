import {mkdir, rm, writeFile} from 'node:fs/promises';
import {join as pathJoin, basename, dirname} from 'node:path';

import {trimExtension} from './util';
import {ProjectorDummy} from './projector.spec';
import {Bundle} from './bundle';

export const specBundlesPath = pathJoin('spec', 'bundles');

export async function cleanBundlesDir(...path: string[]) {
	const dir = pathJoin(specBundlesPath, ...path);
	await rm(dir, {recursive: true, force: true});
	await mkdir(dir, {recursive: true});
	return dir;
}

export class BundleDummy extends Bundle {
	public readonly projector: ProjectorDummy;

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
		return new ProjectorDummy(pathJoin(directory, basename(path)));
	}

	protected async _writeLauncher() {
		await mkdir(dirname(this.path), {recursive: true});
		await writeFile(this.path, 'DUMMY_PE_LAUNCHER_EXE\n', 'utf8');
	}
}

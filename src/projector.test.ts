import {describe, it} from 'node:test';
import {join as pathJoin} from 'node:path';

import {ProjectorDummy, cleanProjectorDir} from './projector.spec';
import {fixtureFile} from './util.spec';

const getDir = async (d: string) => cleanProjectorDir('dummy', d);

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

import {describe, it} from 'node:test';
import {join as pathJoin} from 'node:path';

import {ProjectorDummy, cleanProjectorDir} from './projector.spec';
import {fixtureFile} from './util.spec';

const getDir = async (d: string) => cleanProjectorDir('dummy', d);

void describe('projector', () => {
	void describe('ProjectorDummy', () => {
		void it('simple', async () => {
			const dir = await getDir('simple');
			const dest = pathJoin(dir, 'application.exe');

			const p = new ProjectorDummy(dest);
			p.player = fixtureFile('dummy.exe');
			p.movieFile = fixtureFile('swf3.swf');
			await p.write();
		});
	});
});

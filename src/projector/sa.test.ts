import {describe, it} from 'node:test';
import {join as pathJoin} from 'node:path';

import {cleanProjectorDir, fixtureFile} from '../util.spec.ts';

import {ProjectorSaDummy} from './sa.spec.ts';

const getDir = async (d: string) => cleanProjectorDir('sa', 'dummy', d);

void describe('projector/sa', () => {
	void describe('ProjectorSaDummy', () => {
		void it('simple', async () => {
			const dir = await getDir('simple');
			const dest = pathJoin(dir, 'application.exe');

			const p = new ProjectorSaDummy(dest);
			p.player = fixtureFile('dummy.exe');
			p.movieFile = fixtureFile('swf3.swf');
			await p.write();
		});
	});
});

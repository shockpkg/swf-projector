import {describe, it} from 'node:test';
import {match} from 'node:assert';

import {NAME, VERSION} from './meta';

void describe('meta', () => {
	void it('NAME', () => {
		match(NAME, /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+/);
	});

	void it('VERSION', () => {
		match(VERSION, /^\d+\.\d+\.\d+/);
	});
});

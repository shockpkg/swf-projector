import {describe, it} from 'node:test';
import {match} from 'node:assert';

import {NAME, VERSION} from './meta';

void describe('meta', () => {
	void it('NAME', () => {
		match(NAME, /^(@[\d._a-z-]+\/)?[\d._a-z-]+/);
	});

	void it('VERSION', () => {
		match(VERSION, /^\d+\.\d+\.\d+/);
	});
});

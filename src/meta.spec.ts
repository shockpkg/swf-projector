import {NAME, VERSION} from './meta';

describe('meta', () => {
	it('NAME', () => {
		expect(typeof NAME).toBe('string');
	});

	it('VERSION', () => {
		expect(typeof VERSION).toBe('string');
	});
});

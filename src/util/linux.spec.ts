import {
	linuxScriptLauncher
} from './linux';

describe('util/linux', () => {
	describe('linuxScriptLauncher', () => {
		it('suffix: ".data"', async () => {
			const data = await linuxScriptLauncher('.data');
			expect(data.toString('utf8')).toContain("__suffix='.data'");
		});

		it('suffix: ".test"', async () => {
			const data = await linuxScriptLauncher('.test');
			expect(data.toString('utf8')).toContain("__suffix='.test'");
		});
	});
});

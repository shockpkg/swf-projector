import crypto from 'crypto';

import {windowsLauncher} from './windows';

function sha256(data: Buffer) {
	return crypto.createHash('sha256').update(data).digest('hex').toLowerCase();
}

const launcherTypes: ['i686' | 'x86_64', string][] = [
	[
		'i686',
		'166e5cb9228842e98e59d0cae1578fd0d97c9754944dae6533678716f7fd1c1c'
	],
	[
		'x86_64',
		'6a8e15452b1049ed9727eee65e1f8c81a6ff496f7e452c75268e2c3193dd61b1'
	]
];

describe('util/windows', () => {
	describe('windowsLauncher', () => {
		for (const [type, hash] of launcherTypes) {
			// eslint-disable-next-line no-loop-func
			it(type, async () => {
				const data = await windowsLauncher(type);
				expect(sha256(data)).toBe(hash);
			});
		}
	});
});

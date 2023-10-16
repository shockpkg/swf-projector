import {shouldTest, getInstalledPackagesInfoSync} from '../util.spec';

export function listSamples() {
	const platforms = new Set();
	if (shouldTest('linux-i386')) {
		platforms.add('linux');
		platforms.add('linux-i386');
	}
	if (shouldTest('linux-x86_64')) {
		platforms.add('linux-x86_64');
	}
	return getInstalledPackagesInfoSync()
		.filter(o => platforms.has(o.platform))
		.map(o => ({
			...o,
			type: o.platform === 'linux-x86_64' ? 'x86_64' : 'i386',
			patchProjectorOffset: o.platform === 'linux-x86_64'
		}));
}

export const customWindowTitle =
	'Custom Window Title (Longer Than The Original Window Title Was)';

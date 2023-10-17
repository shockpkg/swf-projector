import {shouldTest, getInstalledPackagesInfoSync} from '../util.spec';

export function listSamples() {
	if (!shouldTest('mac')) {
		return [];
	}
	const fixBrokenIconPathsSet = new Set([
		'flash-player-9.0.28.0-mac-sa-debug',
		'flash-player-9.0.45.0-mac-sa-debug'
	]);
	return getInstalledPackagesInfoSync()
		.filter(o => o.platform.startsWith('mac'))
		.map(o => ({
			...o,
			fixBrokenIconPaths: fixBrokenIconPathsSet.has(o.name)
		}));
}

export const customWindowTitle =
	'Custom Window Title (Longer Than Possible Existing Unused Strings)';

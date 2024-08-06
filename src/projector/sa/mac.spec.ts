import {shouldTest, getInstalledPackagesInfoSync} from '../../util.spec.ts';

export function listSamples() {
	if (!shouldTest('mac')) {
		return [];
	}
	return getInstalledPackagesInfoSync().filter(o =>
		o.platform.startsWith('mac')
	);
}

export const customWindowTitle =
	'Custom Window Title (Longer Than Possible Existing Unused Strings)';

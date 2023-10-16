import {shouldTest, getInstalledPackagesInfoSync} from '../util.spec';

export function listSamples() {
	const platforms = new Set();
	if (shouldTest('windows-i386')) {
		platforms.add('windows');
		platforms.add('windows-32bit');
		platforms.add('windows-i386');
	}
	if (shouldTest('windows-x86_64')) {
		platforms.add('windows-x86_64');
	}
	return getInstalledPackagesInfoSync()
		.filter(o => platforms.has(o.platform))
		.map(o => ({
			...o,
			type: o.platform === 'windows-x86_64' ? 'x86_64' : 'i386',
			patchOutOfDateDisable: o.version[0] >= 30
		}));
}

export const customWindowTitle =
	'Custom Window Title (Longer Than The Original Window Title Was)';

export const versionStrings = {
	FileVersion: '3.14.15.92',
	ProductVersion: '3.1.4.1',
	CompanyName: 'Custom Company Name',
	FileDescription: 'Custom File Description',
	LegalCopyright: 'Custom Legal Copyright',
	ProductName: 'Custom Product Name',
	LegalTrademarks: 'Custom Legal Trademarks',
	OriginalFilename: 'CustomOriginalFilename.exe',
	InternalName: 'CustomInternalName',
	Comments: 'Custom Comments'
};

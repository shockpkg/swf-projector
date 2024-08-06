import {NtExecutableResource, Resource, Data} from '@shockpkg/resedit';

/**
 * Parse PE version string to integers (MS then LS bits) or null.
 *
 * @param version Version string.
 * @returns Version integers ([MS, LS]) or null.
 */
function peVersionInts(version: string): [number, number] | null {
	const parts = version.split(/[,.]/);
	const numbers = [];
	for (const part of parts) {
		const n = /^\d+$/.test(part) ? +part : -1;
		if (n < 0 || n > 0xffff) {
			return null;
		}
		numbers.push(n);
	}
	return numbers.length
		? [
				// eslint-disable-next-line no-bitwise
				(((numbers[0] || 0) << 16) | (numbers[1] || 0)) >>> 0,
				// eslint-disable-next-line no-bitwise
				(((numbers[2] || 0) << 16) | (numbers[3] || 0)) >>> 0
			]
		: null;
}

/**
 * Replace all the icons in all icon groups.
 *
 * @param rsrc NtExecutableResource instance.
 * @param iconData Icon data.
 */
export function rsrcPatchIcon(
	rsrc: NtExecutableResource,
	iconData: Readonly<Uint8Array>
) {
	const ico = Data.IconFile.from(
		iconData.buffer.slice(iconData.byteOffset, iconData.byteLength)
	);
	for (const iconGroup of Resource.IconGroupEntry.fromEntries(rsrc.entries)) {
		Resource.IconGroupEntry.replaceIconsForResource(
			rsrc.entries,
			iconGroup.id,
			iconGroup.lang,
			ico.icons.map(icon => icon.data)
		);
	}
}

/**
 * Update strings if present for all the languages.
 *
 * @param rsrc NtExecutableResource instance.
 * @param versionStrings Version strings.
 */
export function rsrcPatchVersion(
	rsrc: NtExecutableResource,
	versionStrings: Readonly<{[key: string]: string}>
) {
	for (const versionInfo of Resource.VersionInfo.fromEntries(rsrc.entries)) {
		// Get all the languages, not just available languages.
		const languages = versionInfo.getAllLanguagesForStringValues();
		for (const language of languages) {
			versionInfo.setStringValues(language, versionStrings);
		}

		// Update integer values from parsed strings if possible.
		const {FileVersion, ProductVersion} = versionStrings;
		if (FileVersion) {
			const uints = peVersionInts(FileVersion);
			if (uints) {
				const [ms, ls] = uints;
				versionInfo.fixedInfo.fileVersionMS = ms;
				versionInfo.fixedInfo.fileVersionLS = ls;
			}
		}
		if (ProductVersion) {
			const uints = peVersionInts(ProductVersion);
			if (uints) {
				const [ms, ls] = uints;
				versionInfo.fixedInfo.productVersionMS = ms;
				versionInfo.fixedInfo.productVersionLS = ls;
			}
		}

		versionInfo.outputToResourceEntries(rsrc.entries);
	}
}

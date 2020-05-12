import {
	signatureGet,
	signatureSet
} from 'portable-executable-signature';
import * as resedit from 'resedit';
import fse from 'fs-extra';

import {
	bufferToArrayBuffer,
	launcher
} from '../util';

const ResEditNtExecutable =
	resedit.NtExecutable ||
	(resedit as any).default.NtExecutable;

const ResEditNtExecutableResource =
	resedit.NtExecutableResource ||
	(resedit as any).default.NtExecutableResource;

const ResEditResource =
	resedit.Resource ||
	(resedit as any).default.Resource;

const ResEditData =
	resedit.Data ||
	(resedit as any).default.Data;

export interface IPeResourceReplace {

	/**
	 * Replace icons if not null.
	 *
	 * @default null
	 */
	iconData?: Readonly<Buffer> | null;

	/**
	 * Replace version strings if not null.
	 *
	 * @default null
	 */
	versionStrings?: Readonly<{[key: string]: string}> | null;

	/**
	 * If true remove signature if present.
	 *
	 * @default false
	 */
	removeSignature?: boolean | null;
}

/**
 * Parse PE version string to integers (MS then LS bits) or null.
 *
 * @param version Version string.
 * @returns Version integers ([MS, LS]) or null.
 */
export function peVersionInts(version: string): [number, number] | null {
	const parts = version.split(/[.,]/);
	const numbers = [];
	for (const part of parts) {
		const n = /^\d+$/.test(part) ? +part : NaN;
		if (!(n >= 0 && n <= 0xFFFF)) {
			return null;
		}
		numbers.push(n);
	}
	return numbers.length ? [
		// eslint-disable-next-line no-bitwise
		(((numbers[0] || 0) << 16) | (numbers[1] || 0)) >>> 0,
		// eslint-disable-next-line no-bitwise
		(((numbers[2] || 0) << 16) | (numbers[3] || 0)) >>> 0
	] : null;
}

/**
 * Replace resources in Windows PE file.
 *
 * @param path File path.
 * @param options Replacement options.
 */
export async function peResourceReplace(
	path: string,
	options: Readonly<IPeResourceReplace>
) {
	const {
		iconData,
		versionStrings,
		removeSignature
	} = options;

	// Read EXE file and remove signature if present.
	const exeOriginal = await fse.readFile(path);
	const signedData = removeSignature ? null : signatureGet(exeOriginal);
	let exeData = signatureSet(exeOriginal, null, true, true);

	// Parse resources.
	const exe = ResEditNtExecutable.from(exeData);
	const res = ResEditNtExecutableResource.from(exe);

	// Replace all the icons in all icon groups.
	if (iconData) {
		const ico = ResEditData.IconFile.from(
			bufferToArrayBuffer(iconData)
		);
		for (const iconGroup of ResEditResource.IconGroupEntry.fromEntries(
			res.entries
		)) {
			ResEditResource.IconGroupEntry.replaceIconsForResource(
				res.entries,
				iconGroup.id,
				iconGroup.lang,
				ico.icons.map(icon => icon.data)
			);
		}
	}

	// Update strings if present for all the languages.
	if (versionStrings) {
		for (const versionInfo of ResEditResource.VersionInfo.fromEntries(
			res.entries
		)) {
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

			versionInfo.outputToResourceEntries(res.entries);
		}
	}

	// Update resources.
	res.outputResource(exe);
	exeData = exe.generate();

	// Add back signature if not removing.
	if (signedData) {
		exeData = signatureSet(exeData, signedData, true, true);
	}

	// Write updated EXE file.
	await fse.writeFile(path, Buffer.from(exeData));
}

/**
 * Get Windows launcher for the specified type.
 *
 * @param type Executable type.
 * @param resources File to optionally copy resources from.
 * @returns Launcher data.
 */
export async function windowsLauncher(
	type: 'i686' | 'x86_64',
	resources: string | null = null
) {
	let data;
	switch (type) {
		case 'i686': {
			data = await launcher('windows-i686');
			break;
		}
		case 'x86_64': {
			data = await launcher('windows-x86_64');
			break;
		}
		default: {
			throw new Error(`Invalid type: ${type}`);
		}
	}

	// Check if copying resources.
	if (!resources) {
		return data;
	}

	// Remove signature if present.
	const signedData = signatureGet(data);
	let exeData = signatureSet(data, null, true, true);

	// Read resources from file.
	const res = ResEditNtExecutableResource.from(
		ResEditNtExecutable.from(
			await fse.readFile(resources),
			{
				ignoreCert: true
			}
		)
	);

	// Find the first icon group for each language.
	const resIconGroups = new Map();
	for (const iconGroup of ResEditResource.IconGroupEntry.fromEntries(
		res.entries
	)) {
		const known = resIconGroups.get(iconGroup.lang) || null;
		if (!known || iconGroup.id < known.id) {
			resIconGroups.set(iconGroup.lang, iconGroup);
		}
	}

	// List the groups and icons to be kept.
	const iconGroups = new Set();
	const iconDatas = new Set();
	for (const [, group] of resIconGroups) {
		iconGroups.add(group.id);
		for (const icon of group.icons) {
			iconDatas.add(icon.iconID);
		}
	}

	// Filter out the resources to keep.
	const typeVersionInfo = 16;
	const typeIcon = 3;
	const typeIconGroup = 14;
	res.entries = res.entries.filter(entry => (
		entry.type === typeVersionInfo ||
		(entry.type === typeIcon && iconDatas.has(entry.id)) ||
		(entry.type === typeIconGroup && iconGroups.has(entry.id))
	));

	// Apply resources to launcher.
	const exe = ResEditNtExecutable.from(exeData);
	res.outputResource(exe);
	exeData = exe.generate();

	// Add back signature if one present.
	if (signedData) {
		exeData = signatureSet(exeData, signedData, true, true);
	}

	return Buffer.from(exeData);
}

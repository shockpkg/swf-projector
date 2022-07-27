import {readFile, writeFile} from 'fs/promises';
import {TranscodeEncoding} from 'buffer';

import {
	checksumUpdate,
	signatureGet,
	signatureSet
} from 'portable-executable-signature';
import {NtExecutable, NtExecutableResource, Resource, Data} from 'resedit';

import {bufferToArrayBuffer, launcher} from '../util';

import {findExact} from './internal/patch';

export interface IPeResourceReplace {
	//
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
 * Replace resources in Windows PE file.
 *
 * @param path File path.
 * @param options Replacement options.
 */
export async function peResourceReplace(
	path: string,
	options: Readonly<IPeResourceReplace>
) {
	const {iconData, versionStrings, removeSignature} = options;

	// Read EXE file and remove signature if present.
	const exeOriginal = await readFile(path);
	const signedData = removeSignature ? null : signatureGet(exeOriginal);
	let exeData = signatureSet(exeOriginal, null, true, true);

	// Parse resources.
	const exe = NtExecutable.from(exeData);
	const res = NtExecutableResource.from(exe);

	// Replace all the icons in all icon groups.
	if (iconData) {
		const ico = Data.IconFile.from(bufferToArrayBuffer(iconData));
		for (const iconGroup of Resource.IconGroupEntry.fromEntries(
			res.entries
		)) {
			Resource.IconGroupEntry.replaceIconsForResource(
				res.entries,
				iconGroup.id,
				iconGroup.lang,
				ico.icons.map(icon => icon.data)
			);
		}
	}

	// Update strings if present for all the languages.
	if (versionStrings) {
		for (const versionInfo of Resource.VersionInfo.fromEntries(
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
	await writeFile(path, Buffer.from(exeData));
}

/**
 * Search data for string, yields indexes and strings.
 *
 * @param data Data to search.
 * @param pre String prefix to search for.
 * @param enc String encoding.
 * @param reg Regex strings must match.
 * @yields String entry.
 */
function* dataStrings(
	data: Readonly<Buffer>,
	pre: string,
	enc: TranscodeEncoding,
	reg: RegExp | null = null
) {
	const nulled = Buffer.from('\0', enc);
	const bytes = nulled.length;
	const preSize = pre.length * bytes;
	for (const index of findExact(data, Buffer.from(pre, enc))) {
		let more = 0;
		for (more of findExact(data.subarray(index + preSize), nulled)) {
			if (!(more % bytes)) {
				break;
			}
		}
		const stringData = data.subarray(index, index + preSize + more);
		const string = stringData.toString(enc);
		if (reg && !reg.test(string)) {
			continue;
		}
		yield {
			index,
			data: stringData,
			string
		};
	}
}

/**
 * List PE file sections.
 *
 * @param data PE data.
 * @returns PE sections.
 */
function windowsPeSections(data: Readonly<Buffer>) {
	return NtExecutable.from(bufferToArrayBuffer(data), {
		ignoreCert: true
	})
		.getAllSections()
		.map(({info}) => ({
			name: info.name,
			offset: info.pointerToRawData,
			size: info.sizeOfRawData
		}));
}

/**
 * Attempt to replace Windows window title by modifying the .rdata section.
 * Throws an error if replacement title larger than current title.
 *
 * @param data Projector data.
 * @param title Replacement title.
 * @returns Patched data or null if no patch found.
 */
function windowsPatchWindowTitleRdata(data: Readonly<Buffer>, title: string) {
	const enc = 'utf16le';

	// Locate the rdata section in the buffer.
	let rdataInfo = null;
	for (const info of windowsPeSections(data)) {
		if (info.name === '.rdata') {
			rdataInfo = info;
		}
	}
	if (!rdataInfo) {
		return null;
	}
	const rdata = data.subarray(
		rdataInfo.offset,
		rdataInfo.offset + rdataInfo.size
	);

	// Search for known titles (only one format known).
	let found: [number, number] | null = null;
	for (const [pre, reg] of [
		['Adobe Flash Player ', /^Adobe Flash Player \d+([.,]\d+)*$/]
	] as [string, RegExp][]) {
		for (const {index, string, data} of dataStrings(rdata, pre, enc, reg)) {
			// Only one match expected.
			if (found) {
				throw new Error(
					`Multiple window titles found: ${JSON.stringify(string)}`
				);
			}

			// Check if title can replace string.
			if (title.length > string.length) {
				throw new Error(
					`Replacement window title longer that ${string.length}`
				);
			}

			// Remember index for later.
			found = [index, data.length];
		}

		// Stop searching once a known title is found.
		if (found) {
			break;
		}
	}

	// If no match found, no title to replace.
	if (!found) {
		return null;
	}

	// Copy data and replace the title.
	const r = Buffer.concat([data as Buffer]);
	const replacing = r.subarray(
		rdataInfo.offset + found[0],
		rdataInfo.offset + found[0] + found[1]
	);
	replacing.fill(0);
	replacing.write(title, enc);

	// Update checksum.
	checksumUpdate(r, true);
	return r;
}

/**
 * Attempt to replace Windows window title by modifying the resources.
 *
 * @param data Projector data.
 * @param title Replacement title.
 * @returns Patched data or null if no patch found.
 */
function windowsPatchWindowTitleRsrc(data: Readonly<Buffer>, title: string) {
	// Read EXE file and remove signature if present.
	const signedData = signatureGet(data);
	let exeData = signatureSet(data, null, true, true);

	// Parse resources.
	const exe = NtExecutable.from(exeData);
	const res = NtExecutableResource.from(exe);

	// Match all known titles.
	const titleMatch =
		/^((Shockwave )?Flash|(Adobe|Macromedia) Flash Player \d+([.,]\d+)*)$/;

	// Find ID of string table with the title and ID of title if present.
	const typeStringTable = 6;
	let titleStringTableId = null;
	let titleStringTableEntryId = null;
	for (const entry of res.entries) {
		if (entry.type !== typeStringTable) {
			continue;
		}
		const table = Resource.StringTable.fromEntries(entry.lang, [entry]);
		for (const {text} of table.getAllStrings()) {
			if (text.startsWith('Projector ')) {
				titleStringTableId = entry.id;
				break;
			}
		}
		if (titleStringTableId === null) {
			continue;
		}
		for (const {id, text} of table.getAllStrings()) {
			if (titleMatch.test(text)) {
				titleStringTableEntryId = id;
				break;
			}
		}
		break;
	}
	if (titleStringTableId === null || titleStringTableEntryId === null) {
		return null;
	}

	// Replace all the entries.
	for (const entry of res.entries) {
		if (entry.type !== typeStringTable || entry.id !== titleStringTableId) {
			continue;
		}
		const table = Resource.StringTable.fromEntries(entry.lang, [entry]);
		table.setById(titleStringTableEntryId, title);
		table.replaceStringEntriesForExecutable(res);
	}

	// Update resources.
	res.outputResource(exe);
	exeData = exe.generate();

	// Add back signature if not removing.
	if (signedData) {
		exeData = signatureSet(exeData, signedData, true, true);
	}

	return Buffer.from(exeData);
}

/**
 * Attempt to replace Windows window title.
 *
 * @param data Projector data.
 * @param title Replacement title.
 * @returns Patched data.
 */
export function windowsPatchWindowTitle(data: Readonly<Buffer>, title: string) {
	const patchRdata = windowsPatchWindowTitleRdata(data, title);
	if (patchRdata) {
		return patchRdata;
	}

	const patchResource = windowsPatchWindowTitleRsrc(data, title);
	if (patchResource) {
		return patchResource;
	}

	throw new Error('Failed to patch the window title');
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
			throw new Error(`Invalid type: ${type as string}`);
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
	const res = NtExecutableResource.from(
		NtExecutable.from(await readFile(resources), {
			ignoreCert: true
		})
	);

	// Find the first icon group for each language.
	const resIconGroups = new Map<string | number, Resource.IconGroupEntry>();
	for (const iconGroup of Resource.IconGroupEntry.fromEntries(res.entries)) {
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
	res.entries = res.entries.filter(
		entry =>
			entry.type === typeVersionInfo ||
			(entry.type === typeIcon && iconDatas.has(entry.id)) ||
			(entry.type === typeIconGroup && iconGroups.has(entry.id))
	);

	// Apply resources to launcher.
	const exe = NtExecutable.from(exeData);
	res.outputResource(exe);
	exeData = exe.generate();

	// Add back signature if one present.
	if (signedData) {
		exeData = signatureSet(exeData, signedData, true, true);
	}

	return Buffer.from(exeData);
}

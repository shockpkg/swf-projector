import {NtExecutable, NtExecutableResource, Resource} from '@shockpkg/resedit';

import {encodeUtf16, getUtf16} from '../data';
import {findExact, findFuzzy} from '../patch';

import {
	IDD_EXCEPTION,
	IMAGE_SCN_MEM_EXECUTE,
	IMAGE_SCN_MEM_READ,
	IMAGE_SCN_MEM_SHARED,
	IMAGE_SCN_MEM_WRITE
} from './constants';
import {exeCodeSection} from './exe';

/**
 * Patch projector window title stored in resources (versions before 11.2).
 *
 * @param rsrc NtExecutableResource instance.
 * @param title Window title.
 * @returns Returns true if found, else false.
 */
export function patchWindowTitleRsrc(
	rsrc: NtExecutableResource,
	title: string
) {
	// Match all known titles.
	const titleMatch =
		/^((Shockwave )?Flash|(Adobe|Macromedia) Flash Player \d+([.,]\d+)*)$/;

	// Find ID of string table with the title and ID of title if present.
	const typeStringTable = 6;
	let titleStringTableId = null;
	let titleStringTableEntryId = null;
	for (const entry of rsrc.entries) {
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
			// 2.0.0.11 (does not support projectors, but can patch title).
			const strings = table.getAllStrings().map(s => s.text);
			if (
				strings.length === 2 &&
				strings[0] === 'Shockwave Flash' &&
				strings[1].startsWith('Shockwave Flash ')
			) {
				titleStringTableId = entry.id;
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
		return false;
	}

	// Replace all the entries.
	for (const entry of rsrc.entries) {
		if (entry.type !== typeStringTable || entry.id !== titleStringTableId) {
			continue;
		}
		const table = Resource.StringTable.fromEntries(entry.lang, [entry]);
		table.setById(titleStringTableEntryId, title);
		table.replaceStringEntriesForExecutable(rsrc);
	}
	return true;
}

/**
 * Patch projector window title stored in data (versions from 11.2).
 *
 * @param exe NtExecutable instance.
 * @param address The virtualAddress of inserted section title.
 */
export function patchWindowTitleData(exe: NtExecutable, address: number) {
	// Get read-only data sections excluding the exception and inserted ones.
	const excluded = [address];
	for (const idd of [IDD_EXCEPTION]) {
		const s = exe.getSectionByEntry(idd);
		if (s) {
			excluded.push(s.info.virtualAddress);
		}
	}
	const dataSections = exe
		.getAllSections()
		.filter(
			({
				info: {
					characteristics,
					sizeOfRawData,
					virtualAddress,
					virtualSize
				}
			}) => {
				if (
					!sizeOfRawData ||
					// eslint-disable-next-line no-bitwise
					!(characteristics & IMAGE_SCN_MEM_READ) ||
					// eslint-disable-next-line no-bitwise
					characteristics & IMAGE_SCN_MEM_WRITE ||
					// eslint-disable-next-line no-bitwise
					characteristics & IMAGE_SCN_MEM_EXECUTE ||
					// eslint-disable-next-line no-bitwise
					characteristics & IMAGE_SCN_MEM_SHARED
				) {
					return false;
				}
				for (const a of excluded) {
					if (
						a >= virtualAddress &&
						a < virtualAddress + virtualSize
					) {
						return false;
					}
				}
				return true;
			}
		);

	// Search for known titles (only one format known).
	const titles: [string, RegExp][] = [
		['Adobe Flash Player ', /^Adobe Flash Player \d+([.,]\d+)*$/]
	];
	let oldAddress = 0;
	for (const {
		info: {virtualAddress},
		data
	} of dataSections) {
		if (!data) {
			continue;
		}
		const d = new Uint8Array(data);
		for (const [pre, reg] of titles) {
			const pred = encodeUtf16(pre, true);
			for (const index of findExact(d, pred)) {
				const s = getUtf16(d, index, true);
				if (!s || !reg.test(s)) {
					continue;
				}

				// Only one match expected.
				if (oldAddress) {
					throw new Error('Multiple window titles found');
				}

				// Remember address for later.
				oldAddress = virtualAddress + index;
			}
		}
	}
	if (!oldAddress) {
		throw new Error('No window titles found');
	}

	let references = 0;
	const code = exeCodeSection(exe);
	const {virtualAddress} = code.info;
	const data = new Uint8Array(code.data);
	const view = new DataView(code.data);
	const {newHeader} = exe;
	if (newHeader.is32bit()) {
		const {imageBase} = newHeader.optionalHeader;
		const oldA = imageBase + oldAddress;
		const patches: [number, (number | null)[]][] = [
			// All versions.
			// push    ...
			[1, [0x68, null, null, null, null]]
		];
		for (const [o, patch] of patches) {
			for (const i of findFuzzy(data, patch)) {
				const off = i + o;
				const a = view.getUint32(off, true);
				if (a !== oldA) {
					continue;
				}
				view.setUint32(off, imageBase + address, true);
				references++;
			}
		}
	} else {
		const patches: [number, (number | null)[]][] = [
			// All versions.
			// lea     r9, [rip+...]
			[3, [0x4c, 0x8d, 0x0d, null, null, null, null]]
		];
		for (const [o, patch] of patches) {
			const l = patch.length;
			for (const i of findFuzzy(data, patch)) {
				const rip = virtualAddress + i + l;
				const off = i + o;
				const a = rip + view.getUint32(off, true);
				if (a !== oldAddress) {
					continue;
				}
				view.setUint32(off, address - rip, true);
				references++;
			}
		}
	}
	if (references !== 1) {
		throw new Error(`Unexpected window title references: ${references}`);
	}
}

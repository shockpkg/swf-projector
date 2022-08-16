import {readFile} from 'fs/promises';

import {signatureGet, signatureSet} from 'portable-executable-signature';
import {NtExecutable, NtExecutableResource, Resource, Data} from 'resedit';

import {align, bufferAlign, bufferToArrayBuffer, launcher, once} from '../util';

import {
	dataStrings,
	findFuzzy,
	patchHexToBytes,
	patchOnce
} from './internal/patch';

// IMAGE_DATA_DIRECTORY indexes.
const IDD_RESOURCE = 2;
const IDD_EXCEPTION = 3;
const IDD_BASE_RELOCATION = 5;
const IDD_RESERVED = 15;

// IMAGE_SECTION_HEADER characteristics.
const IMAGE_SCN_CNT_CODE = 0x00000020;
const IMAGE_SCN_CNT_INITIALIZED_DATA = 0x00000040;
const IMAGE_SCN_CNT_UNINITIALIZED_DATA = 0x00000080;
const IMAGE_SCN_MEM_SHARED = 0x10000000;
const IMAGE_SCN_MEM_EXECUTE = 0x20000000;
const IMAGE_SCN_MEM_READ = 0x40000000;
const IMAGE_SCN_MEM_WRITE = 0x80000000;

export interface IPePatchProjector {
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
	 * Remove signature if present and true.
	 *
	 * @default false
	 */
	removeCodeSignature?: boolean;

	/**
	 * Attempt to replace Windows window title if not null.
	 *
	 * @default null
	 */
	patchWindowTitle?: string | null;

	/**
	 * Attempt to disable the out-of-date check if true.
	 *
	 * @default false
	 */
	patchOutOfDateDisable?: boolean;
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

const patchesOutOfDateDisable32 = once(() => [
	// 30.0.0.113
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// push    ebp
					'55',
					// mov     ebp, esp
					'8B EC',
					// push    esi
					'56',
					// mov     esi, ecx
					'8B F1',
					// push    edi
					'57',
					// mov     edi, DWORD PTR [ebp+0x8]
					'8B 7D 08',
					// push    edi
					'57',
					// lea     ecx, [esi+0x4]
					'8D 4E 04',
					// call    ...
					'E8 -- -- -- --',
					// mov     eax, DWORD PTR [esi]
					'8B 06',
					// cmp     eax, 0xE
					'83 F8 0E',
					// ja      0x6F
					'77 55',
					// jmp     DWORD PTR [eax*4+...]
					'FF 24 85 -- -- -- --',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 44',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 3A',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 30',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 26',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 1C',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 12',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 08',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// pop     edi
					'5F',
					// pop     esi
					'5E',
					// pop     ebp
					'5D',
					// ret     0x4
					'C2 04 00'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// ret     0x4
					'C2 04 00'
				].join(' ')
			)
		}
	],
	// 31.0.0.108
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// push    ebp
					'55',
					// mov     ebp, esp
					'8B EC',
					// push    esi
					'56',
					// mov     esi, ecx
					'8B F1',
					// push    edi
					'57',
					// mov     edi, DWORD PTR [ebp+0x8]
					'8B 7D 08',
					// push    edi
					'57',
					// lea     ecx, [esi+0x4]
					'8D 4E 04',
					// call    ...
					'E8 -- -- -- --',
					// mov     eax, DWORD PTR [esi]
					'8B 06',
					// dec     eax
					'48',
					// cmp     eax, 0x7
					'83 F8 07',
					// ja      0x70
					'77 55',
					// jmp     DWORD PTR [eax*4+...]
					'FF 24 85 -- -- -- --',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 44',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 3A',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 30',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 26',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 1C',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 12',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 08',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// pop     edi
					'5F',
					// pop     esi
					'5E',
					// pop     ebp
					'5D',
					// ret     0x4
					'C2 04 00'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// ret     0x4
					'C2 04 00'
				].join(' ')
			)
		}
	]
]);
const patchesOutOfDateDisable64 = once(() => [
	// 26.0.0.137, 32.0.0.270
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// mov     QWORD PTR [rsp+0x8], rbx
					'48 89 5C 24 08',
					// push    rdi
					'57',
					// sub     rsp, 0x20
					'48 83 EC 20',
					// mov     rbx, rcx
					'48 8B D9',
					// mov     rdi, rdx
					'48 8B FA',
					// add     rcx, 0x8
					'48 83 C1 08',
					// call    ...
					'E8 -- -- -- --',
					// mov     r8d, DWORD PTR [rbx]
					'44 8B 03',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0xAB
					'0F 84 85 00 00 00',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x9E
					'74 72',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x91
					'74 5F',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x84
					'74 4C',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x77
					'74 39',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x6A
					'74 26',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x5D
					'74 13',
					// cmp     r8d, 0x1
					'41 83 F8 01',
					// jne     0xB6
					'75 66',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 59',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 4C',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 3F',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 32',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 25',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 18',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 0B',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// mov     rbx, QWORD PTR [rsp+0x30]
					'48 8B 5C 24 30',
					// add     rsp, 0x20
					'48 83 C4 20',
					// pop     rdi
					'5F',
					// ret
					'C3'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// ret
					'C3'
				].join(' ')
			)
		}
	],
	// 30.0.0.134
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// mov     QWORD PTR [rsp+0x8], rbx
					'48 89 5C 24 08',
					// push    rdi
					'57',
					// sub     rsp, 0x20
					'48 83 EC 20',
					// mov     rbx, rcx
					'48 8B D9',
					// mov     rdi, rdx
					'48 8B FA',
					// add     rcx, 0x8
					'48 83 C1 08',
					// call    ...
					'E8 -- -- -- --',
					// mov     r8d, DWORD PTR [rbx]
					'44 8B 03',
					// cmp     r8d, 0x5
					'41 83 F8 05',
					// jg      0x81
					'7F 64',
					// je      0x74
					'74 55',
					// test    r8d, r8d
					'45 85 C0',
					// je      0xB8
					'0F 84 90 00 00 00',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x67
					'74 39',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x5A
					'74 26',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x4D
					'74 13',
					// cmp     r8d, 0x1
					'41 83 F8 01',
					// jne     0xB8
					'75 78',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB3
					'EB 6B',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xAE
					'EB 5E',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xA9
					'EB 51',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xA4
					'EB 44',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x9F
					'EB 37',
					// cmp     r8d, 0x6
					'41 83 F8 06',
					// je      0x94
					'74 26',
					// cmp     r8d, 0x7
					'41 83 F8 07',
					// je      0x87
					'74 13',
					// cmp     r8d, 0x8
					'41 83 F8 08',
					// jne     0x9F
					'75 25',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x9A
					'EB 18',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x95
					'EB 0B',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// mov     rbx, QWORD PTR [rsp+0x30]
					'48 8B 5C 24 30',
					// add     rsp, 0x20
					'48 83 C4 20',
					// pop     rdi
					'5F',
					// ret
					'C3'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// ret
					'C3'
				].join(' ')
			)
		}
	]
]);

/**
 * Get the EXE section that includes an address.
 *
 * @param exe NtExecutable instance.
 * @param address The address.
 * @returns The section or null if section not found.
 */
function exeSectionByAddress(exe: NtExecutable, address: number) {
	for (const {info, data} of exe.getAllSections()) {
		const {virtualAddress, virtualSize} = info;
		if (
			address >= virtualAddress &&
			address < virtualAddress + virtualSize
		) {
			return {
				info,
				data
			};
		}
	}
	return null;
}

/**
 * Get the EXE section that includes an address.
 *
 * @param exe NtExecutable instance.
 * @returns The section.
 */
function exeCodeSection(exe: NtExecutable) {
	const s = exeSectionByAddress(exe, exe.newHeader.optionalHeader.baseOfCode);
	if (!s || !s.data) {
		throw new Error(`Invalid PE code section`);
	}
	return {
		info: s.info,
		data: s.data
	};
}

/**
 * Assert the given section is last section.
 *
 * @param exe NtExecutable instance.
 * @param index ImageDirectory index.
 * @param name Friendly name for messages.
 */
function exeAssertLastSection(exe: NtExecutable, index: number, name: string) {
	const section = exe.getSectionByEntry(index);
	if (!section) {
		throw new Error(`Missing section: ${index}:${name}`);
	}
	const allSections = exe.getAllSections();
	let last = allSections[0].info;
	for (const {info} of allSections) {
		if (info.pointerToRawData > last.pointerToRawData) {
			last = info;
		}
	}
	const {info} = section;
	if (info.pointerToRawData < last.pointerToRawData) {
		throw new Error(`Not the last section: ${index}:${name}`);
	}
}

/**
 * Removes the reloc section if exists, fails if not the last section.
 *
 * @param exe NtExecutable instance.
 * @returns Restore function.
 */
function exeRemoveReloc(exe: NtExecutable) {
	const section = exe.getSectionByEntry(IDD_BASE_RELOCATION);
	if (!section) {
		return () => {};
	}
	const {size} =
		exe.newHeader.optionalHeaderDataDirectory.get(IDD_BASE_RELOCATION);
	exeAssertLastSection(exe, IDD_BASE_RELOCATION, '.reloc');
	exe.setSectionByEntry(IDD_BASE_RELOCATION, null);
	return () => {
		exe.setSectionByEntry(IDD_BASE_RELOCATION, section);
		const {virtualAddress} =
			exe.newHeader.optionalHeaderDataDirectory.get(IDD_BASE_RELOCATION);
		exe.newHeader.optionalHeaderDataDirectory.set(IDD_BASE_RELOCATION, {
			virtualAddress,
			size
		});
	};
}

/**
 * Replace all the icons in all icon groups.
 *
 * @param rsrc NtExecutableResource instance.
 * @param iconData Icon data.
 */
function rsrcPatchIcon(rsrc: NtExecutableResource, iconData: Readonly<Buffer>) {
	const ico = Data.IconFile.from(bufferToArrayBuffer(iconData));
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
function rsrcPatchVersion(
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

/**
 * Patch projector window title stored in resources (versions before 11.2).
 *
 * @param rsrc NtExecutableResource instance.
 * @param title Window title.
 * @returns Returns true if found, else false.
 */
function windowsProjectorPatchWindowTitleRsrc(
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
function windowsProjectorPatchWindowTitleData(
	exe: NtExecutable,
	address: number
) {
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
				},
				data
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
		const d = Buffer.from(data);
		for (const [pre, reg] of titles) {
			for (const {index} of dataStrings(d, pre, 'utf16le', reg)) {
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
	const data = Buffer.from(code.data);
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
				const a = data.readUint32LE(off);
				if (a !== oldA) {
					continue;
				}
				data.writeUint32LE(imageBase + address, off);
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
				const a = rip + data.readUint32LE(off);
				if (a !== oldAddress) {
					continue;
				}
				data.writeUint32LE(address - rip, off);
				references++;
			}
		}
	}
	if (references !== 1) {
		throw new Error(`Unexpected window title references: ${references}`);
	}
}

/**
 * Update the sizes in EXE headers.
 *
 * @param exe NtExecutable instance.
 */
function exeUpdateSizes(exe: NtExecutable) {
	const {optionalHeader} = exe.newHeader;
	const {fileAlignment} = optionalHeader;
	let sizeOfCode = 0;
	let sizeOfInitializedData = 0;
	let sizeOfUninitializedData = 0;
	for (const {
		info: {characteristics, sizeOfRawData, virtualSize}
	} of exe.getAllSections()) {
		// eslint-disable-next-line no-bitwise
		if (characteristics & IMAGE_SCN_CNT_CODE) {
			sizeOfCode += sizeOfRawData;
		}
		// eslint-disable-next-line no-bitwise
		if (characteristics & IMAGE_SCN_CNT_INITIALIZED_DATA) {
			sizeOfInitializedData += Math.max(
				sizeOfRawData,
				align(virtualSize, fileAlignment)
			);
		}
		// eslint-disable-next-line no-bitwise
		if (characteristics & IMAGE_SCN_CNT_UNINITIALIZED_DATA) {
			sizeOfUninitializedData += align(virtualSize, fileAlignment);
		}
	}
	optionalHeader.sizeOfCode = sizeOfCode;
	optionalHeader.sizeOfInitializedData = sizeOfInitializedData;
	optionalHeader.sizeOfUninitializedData = sizeOfUninitializedData;
}

/**
 * Apply patches to projector.
 *
 * @param data Projector data.
 * @param options Patch options.
 * @returns Patched projector.
 */
export function windowsProjectorPatch(
	data: Readonly<Buffer>,
	options: IPePatchProjector
) {
	const {
		iconData,
		versionStrings,
		removeCodeSignature,
		patchWindowTitle,
		patchOutOfDateDisable
	} = options;
	let d = bufferToArrayBuffer(data);

	// Remove signature, possibly preserved for later.
	const signature = removeCodeSignature ? null : signatureGet(d);
	d = signatureSet(d, null, true, true);

	// Parse the EXE once, if needed.
	let exe: NtExecutable | null = null;

	// Patch the out-of-date check.
	if (patchOutOfDateDisable) {
		exe = exe || NtExecutable.from(d);

		// Narrow the search to just the code section and patch.
		const code = exeCodeSection(exe);
		const data = Buffer.from(code.data);
		patchOnce(
			data,
			exe.newHeader.is32bit()
				? patchesOutOfDateDisable32()
				: patchesOutOfDateDisable64()
		);
		code.data = bufferToArrayBuffer(data);
	}

	// Do patches that require changing size.
	if (iconData || versionStrings || patchWindowTitle) {
		exe = exe || NtExecutable.from(d);

		// Remove reloc so rsrc can safely be resized.
		const relocRestore = exeRemoveReloc(exe);

		// Remove rsrc to modify and so sections can be added.
		exeAssertLastSection(exe, IDD_RESOURCE, '.rsrc');
		const rsrc = NtExecutableResource.from(exe);
		exe.setSectionByEntry(IDD_RESOURCE, null);

		if (iconData) {
			rsrcPatchIcon(rsrc, iconData);
		}

		if (versionStrings) {
			rsrcPatchVersion(rsrc, versionStrings);
		}

		// If patching title and cannot be done by resource changes.
		let sdTitle: Buffer | null = null;
		if (
			typeof patchWindowTitle === 'string' &&
			!windowsProjectorPatchWindowTitleRsrc(rsrc, patchWindowTitle)
		) {
			sdTitle = bufferAlign(
				Buffer.from(`${patchWindowTitle}\0`, 'utf16le'),
				16
			);
		}

		// Assemble new data section if any.
		const sd = sdTitle;
		if (sd) {
			// PE library lacks a way to add an arbitrary section.
			// Using the reserved index temporarily, then clearing it.
			exe.setSectionByEntry(IDD_RESERVED, {
				info: {
					name: '.shockd',
					virtualSize: sd.length,
					virtualAddress: 0,
					sizeOfRawData: sd.length,
					pointerToRawData: 0,
					pointerToRelocations: 0,
					pointerToLineNumbers: 0,
					numberOfRelocations: 0,
					numberOfLineNumbers: 0,
					characteristics:
						// eslint-disable-next-line no-bitwise
						IMAGE_SCN_CNT_INITIALIZED_DATA | IMAGE_SCN_MEM_READ
				},
				data: bufferToArrayBuffer(sd)
			});
			const s = exe.getSectionByEntry(IDD_RESERVED);
			exe.newHeader.optionalHeaderDataDirectory.set(IDD_RESERVED, {
				virtualAddress: 0,
				size: 0
			});
			if (!s) {
				throw new Error('Internal error');
			}

			// Patch title if in the data.
			if (sdTitle) {
				windowsProjectorPatchWindowTitleData(
					exe,
					s.info.virtualAddress
				);
			}
		}

		// Add rsrc back.
		rsrc.outputResource(exe, false, true);

		// Add reloc back.
		relocRestore();

		// Update sizes.
		exeUpdateSizes(exe);
	}

	// If the EXE was parsed generate new data from it.
	if (exe) {
		d = exe.generate();
	}

	// Add back signature if one preserved.
	if (signature) {
		d = signatureSet(d, signature, true, true);
	}

	return Buffer.from(d);
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

	// Read resources from file.
	const rsrc = NtExecutableResource.from(
		NtExecutable.from(await readFile(resources), {
			ignoreCert: true
		})
	);

	// Find the first icon group for each language.
	const resIconGroups = new Map<string | number, Resource.IconGroupEntry>();
	for (const iconGroup of Resource.IconGroupEntry.fromEntries(rsrc.entries)) {
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
	rsrc.entries = rsrc.entries.filter(
		entry =>
			entry.type === typeVersionInfo ||
			(entry.type === typeIcon && iconDatas.has(entry.id)) ||
			(entry.type === typeIconGroup && iconGroups.has(entry.id))
	);

	// Remove signature if present.
	const signedData = signatureGet(data);
	let exeData = signatureSet(data, null, true, true);

	// Parse launcher.
	const exe = NtExecutable.from(exeData);

	// Remove reloc so rsrc can safely be resized.
	const relocRestore = exeRemoveReloc(exe);

	// Apply resources to launcher.
	rsrc.outputResource(exe, false, true);

	// Add reloc back.
	relocRestore();

	// Update sizes.
	exeUpdateSizes(exe);

	// Generated the updated launcher.
	exeData = exe.generate();

	// Add back signature if one present.
	if (signedData) {
		exeData = signatureSet(exeData, signedData, true, true);
	}

	return Buffer.from(exeData);
}

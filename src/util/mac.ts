import {readFile} from 'fs/promises';

import {Plist, Value, ValueDict, ValueString} from '@shockpkg/plist-dom';
import {unsign} from 'macho-unsign';

import {
	once,
	launcher,
	hex4,
	align,
	getU32,
	getCstrN,
	getU64,
	bufferAlign,
	setU32,
	setU64
} from '../util';

import {slider} from './internal/patch';
import {
	VM_PROT_READ,
	FAT_MAGIC,
	MH_MAGIC,
	MH_CIGAM,
	MH_MAGIC_64,
	MH_CIGAM_64,
	LC_SEGMENT,
	LC_SYMTAB,
	LC_DYSYMTAB,
	LC_SEGMENT_64,
	LC_CODE_SIGNATURE,
	LC_SEGMENT_SPLIT_INFO,
	LC_DYLD_INFO,
	LC_DYLD_INFO_ONLY,
	LC_FUNCTION_STARTS,
	LC_DATA_IN_CODE,
	LC_DYLIB_CODE_SIGN_DRS,
	LC_LINKER_OPTIMIZATION_HINT,
	LC_DYLD_EXPORTS_TRIE,
	LC_DYLD_CHAINED_FIXUPS,
	SEG_TEXT,
	SECT_TEXT,
	SEG_LINKEDIT,
	CPU_TYPE_POWERPC,
	CPU_TYPE_POWERPC64,
	CPU_TYPE_I386,
	CPU_TYPE_X86_64
} from './internal/mac/constants';
import {
	MacProjectTitlePatch,
	macProjectTitlePatchesByCpuType
} from './internal/mac/title';

const launcherMappings = once(
	() =>
		new Map([
			[CPU_TYPE_POWERPC, 'mac-app-ppc'],
			[CPU_TYPE_POWERPC64, 'mac-app-ppc64'],
			[CPU_TYPE_I386, 'mac-app-i386'],
			[CPU_TYPE_X86_64, 'mac-app-x86_64']
		])
);

export interface IMachoType {
	//
	/**
	 * CPU type.
	 */
	cpuType: number;

	/**
	 * CPU subtype.
	 */
	cpuSubtype: number;
}

/**
 * Align size for vmsize.
 *
 * @param size Raw size.
 * @returns Aligned vmsize.
 */
function alignVmsize(size: number) {
	return align(Math.max(size, 0x4000), 0x1000);
}

/**
 * Parse plist data.
 * Currently only supports XML plist.
 *
 * @param data Plist XML.
 * @returns Plist document.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function plistParse(data: string) {
	const plist = new Plist();
	plist.fromXml(data);
	return plist;
}

/**
 * Read plist file.
 * Currently only supports XML plist.
 *
 * @param path Plist file.
 * @returns Plist document.
 */
export async function plistRead(path: string) {
	return plistParse(await readFile(path, 'utf8'));
}

/**
 * Get Info.plist dictionary or throw.
 *
 * @param plist Plist document.
 * @returns Dictionary object.
 */
export function infoPlistDict(plist: Plist) {
	return plist.getValue().castAs(ValueDict);
}

/**
 * Get Info.plist dictionary value or throw.
 *
 * @param plist Plist document.
 * @param key Dictionary key.
 * @returns Value object.
 */
export function infoPlistDictGetValue(plist: Plist, key: string) {
	return infoPlistDict(plist).getValue(key);
}

/**
 * Set Info.plist dictionary value or throw.
 *
 * @param plist Plist document.
 * @param key Dictionary key.
 * @param value Value object.
 */
export function infoPlistDictSet(
	plist: Plist,
	key: string,
	value: Value | null
) {
	const dict = infoPlistDict(plist);
	if (value) {
		dict.set(key, value);
	} else {
		dict.delete(key);
	}
}

/**
 * Get Info.plist bundle executable.
 *
 * @param plist Plist document.
 * @returns Executable name.
 */
export function infoPlistBundleExecutableGet(plist: Plist) {
	return infoPlistDictGetValue(plist, 'CFBundleExecutable').castAs(
		ValueString
	).value;
}

/**
 * Set Info.plist bundle executable.
 *
 * @param plist Plist document.
 * @param value Executable name.
 */
export function infoPlistBundleExecutableSet(
	plist: Plist,
	value: string | null
) {
	const v = value === null ? null : new ValueString(value);
	infoPlistDictSet(plist, 'CFBundleExecutable', v);
}

/**
 * Get Info.plist bundle icon.
 *
 * @param plist Plist document.
 * @returns Icon name.
 */
export function infoPlistBundleIconFileGet(plist: Plist) {
	return infoPlistDictGetValue(plist, 'CFBundleIconFile').castAs(ValueString)
		.value;
}

/**
 * Set Info.plist bundle icon.
 *
 * @param plist Plist document.
 * @param value Icon name.
 */
export function infoPlistBundleIconFileSet(plist: Plist, value: string | null) {
	const v = value === null ? null : new ValueString(value);
	infoPlistDictSet(plist, 'CFBundleIconFile', v);
}

/**
 * Set Info.plist bundle name.
 *
 * @param plist Plist document.
 * @param value Icon name.
 */
export function infoPlistBundleNameSet(plist: Plist, value: string | null) {
	const v = value === null ? null : new ValueString(value);
	infoPlistDictSet(plist, 'CFBundleName', v);
}

/**
 * Delete Info.plist bundle name.
 *
 * @param plist Plist document.
 */
export function infoPlistBundleDocumentTypesDelete(plist: Plist) {
	infoPlistDictSet(plist, 'CFBundleDocumentTypes', null);
}

/**
 * Get types of Mach-O data, array if FAT binary, else a single object.
 *
 * @param data Mach-O data.
 * @returns Mach-O types.
 */
export function machoTypesData(data: Readonly<Buffer>) {
	let le = false;

	/**
	 * Read UINT32 at offset.
	 *
	 * @param offset File offset.
	 * @returns UINT32 value.
	 */
	// eslint-disable-next-line arrow-body-style
	const uint32 = (offset: number) => {
		return le ? data.readUInt32LE(offset) : data.readUInt32BE(offset);
	};

	/**
	 * Read type at offset.
	 *
	 * @param offset File offset.
	 * @returns Type object.
	 */
	const type = (offset: number): IMachoType => ({
		cpuType: uint32(offset),
		cpuSubtype: uint32(offset + 4)
	});

	const magic = uint32(0);
	switch (magic) {
		case FAT_MAGIC: {
			const r = [];
			const count = uint32(4);
			let offset = 8;
			for (let i = 0; i < count; i++) {
				r.push(type(offset));
				offset += 20;
			}
			return r;
		}
		case MH_MAGIC:
		case MH_MAGIC_64: {
			return type(4);
		}
		case MH_CIGAM:
		case MH_CIGAM_64: {
			le = true;
			return type(4);
		}
		default: {
			throw new Error(`Unknown header magic: 0x${hex4(magic)}`);
		}
	}
}

/**
 * Get types of Mach-O file, array if FAT binary, else a single object.
 *
 * @param path Mach-O file.
 * @returns Mach-O types.
 */
export async function machoTypesFile(path: string) {
	return machoTypesData(await readFile(path));
}

/**
 * Create FAT Mach-O data from thin Mach-O binaries.
 *
 * @param machos Mach-O binary datas.
 * @returns FAT binary.
 */
export function machoFat(machos: Readonly<Readonly<Buffer>[]>) {
	// The lipo utility always uses 12/4096 for ppc, ppc64, i386, and x86_64.
	const align = 12;
	// eslint-disable-next-line no-bitwise
	const alignSize = (1 << align) >>> 0;

	// Create the FAT header.
	const head = Buffer.alloc(8);
	head.writeUInt32BE(FAT_MAGIC, 0);

	// Start assembling the pieces.
	const pieces = [head];
	let total = head.length;

	/**
	 * Helper to add pieces and update total length.
	 *
	 * @param data Data.
	 */
	const add = (data: Buffer) => {
		pieces.push(data);
		total += data.length;
	};

	/**
	 * Helper to pad pieces.
	 */
	const pad = () => {
		const over = total % alignSize;
		if (over) {
			add(Buffer.alloc(alignSize - over));
		}
	};

	// List all the binaries.
	const thins = [];
	for (const body of machos) {
		const type = machoTypesData(body);
		if (Array.isArray(type)) {
			throw new Error('Cannot nest FAT binary');
		}
		const head = Buffer.alloc(20);
		head.writeUInt32BE(type.cpuType, 0);
		head.writeUInt32BE(type.cpuSubtype, 4);
		head.writeUInt32BE(align, 16);
		add(head);
		thins.push({
			head,
			body
		});
	}

	// Set count in header.
	head.writeUInt32BE(thins.length, 4);

	// Add binaries aligned, updating their headers.
	for (const {head, body} of thins) {
		pad();
		head.writeUInt32BE(total, 8);
		head.writeUInt32BE(body.length, 12);
		add(body);
	}

	// Merge all the pieces.
	return Buffer.concat(pieces, total);
}

/**
 * Read THIN binaries in a Mach-O binary which might be FAT.
 * Returns slices of the original buffer if a FAT binary.
 * Else it just returns the single THIN binary.
 *
 * @param data Mach-O binary data.
 * @returns Mach-O binary data or datas.
 */
export function machoThins<T extends Readonly<Buffer>>(data: T) {
	if (data.readUInt32BE(0) !== FAT_MAGIC) {
		return data;
	}
	const r = [];
	const count = data.readUInt32BE(4);
	let offset = 8;
	for (let i = 0; i < count; i++) {
		const start = data.readUInt32BE(offset + 8);
		const end = start + data.readUInt32BE(offset + 12);
		r.push(data.subarray(start, end) as T);
		offset += 20;
	}
	return r;
}

/**
 * Get Mach-O app launcher for a single type.
 *
 * @param type Mach-O type.
 * @returns Launcher data.
 */
export async function machoAppLauncherThin(type: Readonly<IMachoType>) {
	const {cpuType} = type;
	const id = launcherMappings().get(cpuType);
	if (!id) {
		throw new Error(`Unknown CPU type: 0x${hex4(cpuType)}`);
	}
	return launcher(id);
}

/**
 * Get Mach-O app launcher for a type list.
 *
 * @param types Mach-O types.
 * @returns Launcher data.
 */
export async function machoAppLauncherFat(
	types: Readonly<Readonly<IMachoType>[]>
) {
	return machoFat(await Promise.all(types.map(machoAppLauncherThin)));
}

/**
 * Get Mach-O app launcher for a single or multiple types.
 *
 * @param types Mach-O types.
 * @returns Launcher data.
 */
export async function machoAppLauncher(
	types: Readonly<IMachoType> | Readonly<Readonly<IMachoType>[]>
) {
	return Array.isArray(types)
		? machoAppLauncherFat(types as IMachoType[])
		: machoAppLauncherThin(types as IMachoType);
}

export interface IMacProjectorMachoPatch {
	//
	/**
	 * Remove signature if present and true.
	 *
	 * @default false
	 */
	removeCodeSignature?: boolean;

	/**
	 * Attempt to replace the window title if not null.
	 *
	 * @default null
	 */
	patchWindowTitle?: string | null;
}

/**
 * Patcher for each binary.
 *
 * @param data Mach-O data.
 * @param title Window title.
 * @returns Patched binary.
 */
function macProjectorMachoPatchEach(data: Buffer, title: string) {
	let le = false;
	let lp = false;
	const magic = getU32(data, 0, le);
	switch (magic) {
		case MH_MAGIC: {
			le = false;
			lp = false;
			break;
		}
		case MH_MAGIC_64: {
			le = false;
			lp = true;
			break;
		}
		case MH_CIGAM: {
			le = true;
			lp = false;
			break;
		}
		case MH_CIGAM_64: {
			le = true;
			lp = true;
			break;
		}
		default: {
			throw new Error(`Unknown header magic: 0x${hex4(magic)}`);
		}
	}
	const SEGMENT = lp ? LC_SEGMENT_64 : LC_SEGMENT;

	// Read header and commands.
	const headerSize = lp ? 32 : 28;
	const header = data.subarray(0, headerSize);
	const numLoadCommands = getU32(header, 16, le);
	const sizeOfLoadCommands = getU32(header, 20, le);
	const commands = [];
	let lcd = data.subarray(headerSize, headerSize + sizeOfLoadCommands);
	for (let c = 0; c < numLoadCommands; c++) {
		const commandSize = getU32(lcd, 4, le);
		commands.push(lcd.subarray(0, commandSize));
		lcd = lcd.subarray(commandSize);
	}

	// Find the closing segment.
	let linkeditI = -1;
	for (let i = 0; i < commands.length; i++) {
		const command = commands[i];
		if (
			getU32(command, 0, le) === SEGMENT &&
			getCstrN(command, 8, 16) === SEG_LINKEDIT
		) {
			if (linkeditI > 0) {
				throw new Error(`Multiple ${SEG_LINKEDIT}`);
			}
			linkeditI = i;
		}
	}
	if (linkeditI < 0) {
		throw new Error(`Missing ${SEG_LINKEDIT}`);
	}
	const linkedit = commands[linkeditI];

	// Remember closing segment position to put one there before it.
	const vmaddr = lp ? getU64(linkedit, 24, le) : getU32(linkedit, 24, le);
	const fileoff = lp ? getU64(linkedit, 40, le) : getU32(linkedit, 32, le);
	const filesize = lp ? getU64(linkedit, 48, le) : getU32(linkedit, 36, le);

	// Create the new section and segment.
	const aligned = 16;
	const segname = '__SHOCKPKG_DATA';
	const secname = segname.toLowerCase();
	const secdata = bufferAlign(
		Buffer.concat([Buffer.alloc(4), Buffer.from(`${title}\0`, 'utf16le')]),
		aligned
	);
	setU32(secdata, 0, le, title.length);
	const seg = Buffer.alloc(lp ? 72 + 80 : 56 + 68);
	const sec = seg.subarray(lp ? 72 : 56);
	sec.write(secname, 0, 16, 'ascii');
	sec.write(segname, 16, 16, 'ascii');
	sec.write(segname, 16, 16, 'ascii');
	if (lp) {
		setU64(sec, 32, le, vmaddr);
		setU64(sec, 40, le, secdata.length);
		setU32(sec, 48, le, fileoff);
		setU32(sec, 52, le, secdata.length < aligned ? 0 : 4);
	} else {
		setU32(sec, 32, le, vmaddr);
		setU32(sec, 36, le, secdata.length);
		setU32(sec, 40, le, fileoff);
		setU32(sec, 44, le, secdata.length < aligned ? 0 : 4);
	}
	setU32(seg, 0, le, SEGMENT);
	setU32(seg, 4, le, seg.length);
	seg.write(segname, 8, 16, 'ascii');
	const segSize = alignVmsize(secdata.length);
	if (lp) {
		setU64(seg, 24, le, vmaddr);
		setU64(seg, 32, le, segSize);
		setU64(seg, 40, le, fileoff);
		setU64(seg, 48, le, segSize);
		setU32(seg, 56, le, VM_PROT_READ);
		setU32(seg, 60, le, VM_PROT_READ);
		setU32(seg, 64, le, 1);
	} else {
		setU32(seg, 24, le, vmaddr);
		setU32(seg, 28, le, segSize);
		setU32(seg, 32, le, fileoff);
		setU32(seg, 36, le, segSize);
		setU32(seg, 40, le, VM_PROT_READ);
		setU32(seg, 44, le, VM_PROT_READ);
		setU32(seg, 48, le, 1);
	}

	// Shift closing segment down.
	if (lp) {
		setU64(linkedit, 24, le, vmaddr + segSize);
		setU64(linkedit, 40, le, fileoff + segSize);
	} else {
		setU32(linkedit, 24, le, vmaddr + segSize);
		setU32(linkedit, 32, le, fileoff + segSize);
	}

	// Shift any offsets that could reference closing segment.
	const slide = slider(segSize, fileoff, filesize);
	for (const command of commands) {
		switch (getU32(command, 0, le)) {
			case LC_DYLD_INFO:
			case LC_DYLD_INFO_ONLY: {
				slide.u32(command, 8, le);
				slide.u32(command, 16, le);
				slide.u32(command, 24, le);
				slide.u32(command, 32, le);
				slide.u32(command, 40, le);
				break;
			}
			case LC_SYMTAB: {
				slide.u32(command, 8, le);
				slide.u32(command, 16, le);
				break;
			}
			case LC_DYSYMTAB: {
				slide.u32(command, 32, le);
				slide.u32(command, 40, le);
				slide.u32(command, 48, le);
				slide.u32(command, 56, le);
				slide.u32(command, 64, le);
				slide.u32(command, 72, le);
				break;
			}
			case LC_CODE_SIGNATURE:
			case LC_SEGMENT_SPLIT_INFO:
			case LC_FUNCTION_STARTS:
			case LC_DATA_IN_CODE:
			case LC_DYLIB_CODE_SIGN_DRS:
			case LC_LINKER_OPTIMIZATION_HINT:
			case LC_DYLD_EXPORTS_TRIE:
			case LC_DYLD_CHAINED_FIXUPS: {
				slide.u32(command, 8, le);
				break;
			}
			default: {
				// Do nothing.
			}
		}
	}

	// Update header and insert the segment.
	setU32(header, 16, le, numLoadCommands + 1);
	setU32(header, 20, le, sizeOfLoadCommands + seg.length);
	commands.splice(linkeditI, 0, seg);

	// Construct the new binary, inserting new section data.
	const macho = Buffer.concat([
		header,
		...commands,
		data.subarray(
			commands.reduce((v, c) => v + c.length, header.length),
			fileoff
		),
		secdata,
		Buffer.alloc(segSize - secdata.length),
		data.subarray(fileoff)
	]);

	// Find the text section.
	let textSegment: Buffer | null = null;
	for (const command of commands) {
		if (
			getU32(command, 0, le) === SEGMENT &&
			getCstrN(command, 8, 16) === SEG_TEXT
		) {
			if (textSegment) {
				throw new Error(`Multiple ${SEG_TEXT}`);
			}
			textSegment = command;
		}
	}
	if (!textSegment) {
		throw new Error(`Missing ${SEG_TEXT}`);
	}
	const textSectionCount = getU32(textSegment, lp ? 64 : 48, le);
	let textSection: Buffer | null = null;
	for (let i = 0; i < textSectionCount; i++) {
		const o = lp ? 72 + 80 * i : 56 + 68 * i;
		if (getCstrN(textSegment, o, 16) === SECT_TEXT) {
			if (textSection) {
				throw new Error(`Multiple ${SECT_TEXT}`);
			}
			textSection = textSegment.subarray(o, o + (lp ? 80 : 68));
		}
	}
	if (!textSection) {
		throw new Error(`Missing ${SECT_TEXT}`);
	}
	const textSectionAddress = lp
		? getU64(textSection, 32, le)
		: getU32(textSection, 32, le);
	const textSectionSize = lp
		? getU64(textSection, 40, le)
		: getU32(textSection, 36, le);
	const textSectionOffset = lp
		? getU32(textSection, 48, le)
		: getU32(textSection, 40, le);
	const textSectionData = macho.subarray(
		textSectionOffset,
		textSectionOffset + textSectionSize
	);

	// Patch the text section to reference the title.
	const cpuType = getU32(header, 4, le);
	let found: MacProjectTitlePatch | null = null;
	const patchers = macProjectTitlePatchesByCpuType().get(cpuType) || [];
	for (const Patcher of patchers) {
		const patcher = new Patcher(
			textSectionData,
			textSectionAddress,
			vmaddr
		);
		if (patcher.check()) {
			if (found) {
				throw new Error(
					`Duplicate patcher for CPU type: 0x${hex4(cpuType)}`
				);
			}
			found = patcher;
		}
	}
	if (!found) {
		throw new Error(`No patcher for CPU type: 0x${hex4(cpuType)}`);
	}
	found.patch();
	return macho;
}

/**
 * Apply patches to projector Mach-O binary.
 *
 * @param macho Mach-O data.
 * @param options Patch options.
 * @returns Patched Mach-O.
 */
export function macProjectorMachoPatch(
	macho: Readonly<Buffer>,
	options: Readonly<IMacProjectorMachoPatch>
) {
	const {removeCodeSignature, patchWindowTitle} = options;

	// Remove signature, make copy.
	let data;
	if (removeCodeSignature) {
		const unsigned = unsign(macho);
		data = unsigned ? Buffer.from(unsigned) : Buffer.concat([macho]);
	} else {
		data = Buffer.concat([macho]);
	}

	if (typeof patchWindowTitle !== 'string') {
		return data;
	}

	const thins = machoThins(data);
	if (!Array.isArray(thins)) {
		return macProjectorMachoPatchEach(thins, patchWindowTitle);
	}
	return machoFat(
		thins.map(thin => macProjectorMachoPatchEach(thin, patchWindowTitle))
	);
}

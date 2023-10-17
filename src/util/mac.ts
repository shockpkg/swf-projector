import {open} from 'node:fs/promises';

import {unsign} from 'macho-unsign';

import {launcher} from '../util';

import {
	hex4,
	getU32,
	setU32,
	getU64,
	setU64,
	getCstrN,
	slider,
	align,
	bufferAlign
} from './internal/patch';
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

export interface IMachoType {
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
 * Get types of Mach-O data, array if FAT binary, else a single object.
 *
 * @param data Mach-O data.
 * @returns Mach-O types.
 */
export function machoTypesData(data: Readonly<Uint8Array>) {
	let le = false;
	const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

	/**
	 * Read type at offset.
	 *
	 * @param offset File offset.
	 * @returns Type object.
	 */
	const type = (offset: number): IMachoType => ({
		cpuType: dv.getUint32(offset, le),
		cpuSubtype: dv.getUint32(offset + 4, le)
	});

	const magic = dv.getUint32(0, le);
	switch (magic) {
		case FAT_MAGIC: {
			const r = [];
			const count = dv.getUint32(4, le);
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
			throw new Error(`Unknown header magic: 0x${magic.toString(16)}`);
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
	let data;
	const f = await open(path, 'r');
	try {
		const m = 8;
		const h = new Uint8Array(m);
		const {bytesRead} = await f.read(h, 0, m, 0);
		if (bytesRead < m) {
			data = h.subarray(0, bytesRead);
		} else {
			const v = new DataView(h.buffer, h.byteOffset, h.byteLength);
			const n =
				v.getUint32(0, false) === FAT_MAGIC
					? v.getUint32(4, false) * 20
					: 4;
			const d = new Uint8Array(m + n);
			d.set(h);
			const {bytesRead} = await f.read(d, m, n, m);
			data = d.subarray(0, m + bytesRead);
		}
	} finally {
		await f.close();
	}
	return machoTypesData(data);
}

/**
 * Create FAT Mach-O data from thin Mach-O binaries.
 *
 * @param machos Mach-O binary datas.
 * @returns FAT binary.
 */
export function machoFat(machos: Readonly<Readonly<Uint8Array>[]>) {
	// The lipo utility always uses 12/4096 for ppc, ppc64, i386, and x86_64.
	const align = 12;
	// eslint-disable-next-line no-bitwise
	const alignSize = (1 << align) >>> 0;

	// Create the FAT header.
	const headD = new Uint8Array(8);
	const headV = new DataView(
		headD.buffer,
		headD.byteOffset,
		headD.byteLength
	);
	headV.setUint32(0, FAT_MAGIC, false);

	// The pieces and their total length.
	const pieces: Uint8Array[] = [headD];
	let total = headD.length;

	/**
	 * Helper to add pieces and update total length.
	 *
	 * @param data Data.
	 */
	const add = (data: Uint8Array) => {
		pieces.push(data);
		total += data.length;
	};

	/**
	 * Helper to pad pieces.
	 */
	const pad = () => {
		const over = total % alignSize;
		if (over) {
			add(new Uint8Array(alignSize - over));
		}
	};

	// List all the binaries.
	const thins = [];
	for (const body of machos) {
		const type = machoTypesData(body);
		if (Array.isArray(type)) {
			throw new Error('Cannot nest FAT binary');
		}
		const headD = new Uint8Array(20);
		const headV = new DataView(
			headD.buffer,
			headD.byteOffset,
			headD.byteLength
		);
		headV.setUint32(0, type.cpuType, false);
		headV.setUint32(4, type.cpuSubtype, false);
		headV.setUint32(16, align, false);
		thins.push({
			headV,
			body
		});
		add(headD);
	}

	// Set count in header.
	headV.setUint32(4, thins.length, false);

	// Add binaries aligned, updating their headers.
	for (const {headV, body} of thins) {
		pad();
		headV.setUint32(8, total, false);
		headV.setUint32(12, body.length, false);
		add(body);
	}

	// Merge all the pieces.
	const r = new Uint8Array(total);
	let i = 0;
	for (const piece of pieces) {
		r.set(piece, i);
		i += piece.length;
	}
	return r;
}

/**
 * Read THIN binaries in a Mach-O binary which might be FAT.
 * Returns slices of the original buffer if a FAT binary.
 * Else it just returns the single THIN binary.
 *
 * @param data Mach-O binary data.
 * @returns Mach-O binary data or datas.
 */
export function machoThins<T extends Readonly<Uint8Array>>(data: T) {
	const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
	if (v.getUint32(0, false) !== FAT_MAGIC) {
		return data;
	}
	const r = [];
	const count = v.getUint32(4, false);
	let offset = 8;
	for (let i = 0; i < count; i++) {
		const start = v.getUint32(offset + 8, false);
		const end = start + v.getUint32(offset + 12, false);
		r.push(data.subarray(start, end) as T);
		offset += 20;
	}
	return r;
}

export interface IMacProjectorMachoPatch {
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
	sec.write(secname, 0, 16);
	sec.write(segname, 16, 16);
	sec.write(segname, 16, 16);
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
	seg.write(segname, 8, 16);
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
		setU64(linkedit, 24, le, BigInt(vmaddr) + BigInt(segSize));
		setU64(linkedit, 40, le, BigInt(fileoff) + BigInt(segSize));
	} else {
		setU32(linkedit, 24, le, Number(vmaddr) + Number(segSize));
		setU32(linkedit, 32, le, Number(fileoff) + Number(segSize));
	}

	// Shift any offsets that could reference closing segment.
	const slide = slider(segSize, Number(fileoff), Number(filesize));
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
			Number(fileoff)
		),
		secdata,
		Buffer.alloc(segSize - secdata.length),
		data.subarray(Number(fileoff))
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
		textSectionOffset + Number(textSectionSize)
	);

	// Patch the text section to reference the title.
	const cpuType = getU32(header, 4, le);
	let found: MacProjectTitlePatch | null = null;
	const patchers = macProjectTitlePatchesByCpuType().get(cpuType) || [];
	for (const Patcher of patchers) {
		const patcher = new Patcher(
			textSectionData,
			Number(textSectionAddress),
			Number(vmaddr)
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
	macho: Readonly<Uint8Array>,
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

/**
 * Get Mach-O app launcher for a single type.
 *
 * @param type Mach-O type.
 * @returns Launcher data.
 */
export async function machoAppLauncherThin(type: Readonly<IMachoType>) {
	const {cpuType} = type;
	let id = '';
	switch (cpuType) {
		case CPU_TYPE_POWERPC: {
			id = 'mac-app-ppc';
			break;
		}
		case CPU_TYPE_POWERPC64: {
			id = 'mac-app-ppc64';
			break;
		}
		case CPU_TYPE_I386: {
			id = 'mac-app-i386';
			break;
		}
		case CPU_TYPE_X86_64: {
			id = 'mac-app-x86_64';
			break;
		}
		default: {
			throw new Error(`Unknown CPU type: 0x${cpuType.toString(16)}`);
		}
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

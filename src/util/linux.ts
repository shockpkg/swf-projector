import {launcher} from '../util';

import {align} from './internal/patch';
import {
	decode,
	Elf32,
	Elf32Shdr,
	Elf64,
	Elf64Shdr,
	PT_LOAD,
	SHF_ALLOC,
	SHT_NOBITS,
	SHT_PROGBITS,
	SHT_STRTAB
} from './internal/linux/elf';
import {Patch} from './internal/linux/patch';
import {title64} from './internal/linux/title64';
import {title32} from './internal/linux/title32';
import {menu64} from './internal/linux/menu64';
import {menu32} from './internal/linux/menu32';
import {path64} from './internal/linux/path64';
import {path32} from './internal/linux/path32';
import {offset64} from './internal/linux/offset64';

/**
 * Add two numbers of bigints assuming same type.
 *
 * @param a A number of bigint.
 * @param b A number of bigint.
 * @returns A number of bigint.
 */
function add(a: number | bigint, b: number | bigint) {
	return ((a as number) + (b as number)) as number | bigint;
}

/**
 * Add a data section to an existring ELF.
 *
 * @param elf Elf object.
 * @param data New data.
 * @returns Inserted section.
 */
function linuxProjectorAddSection(
	elf: Elf32 | Elf64,
	data: Readonly<Uint8Array>
) {
	const aligned = 64;
	const secnameData = '.shockpkg.data';
	const secnameDataD = Buffer.from(`${secnameData}\0`);
	const secnameDataS = secnameDataD.length;
	const secnameEof = '.shockpkg.eof';
	const secnameEofD = Buffer.from(`${secnameEof}\0`);
	const secnameEofS = secnameEofD.length;
	const secdata = new ArrayBuffer(align(data.length, aligned));
	new Uint8Array(secdata).set(data);

	// Get the highest PT_LOAD program header, sanity checked.
	let phdrLoadLast = null;
	for (const phdr of elf.programHeaders) {
		if (
			phdr.pType === PT_LOAD &&
			(phdrLoadLast === null || phdr.pVaddr >= phdrLoadLast.pVaddr)
		) {
			phdrLoadLast = phdr;
		}
	}
	if (!phdrLoadLast) {
		throw new Error('No PT_LOAD program headers');
	}
	const origPhdrLoadEndM = add(phdrLoadLast.pVaddr, phdrLoadLast.pMemsz);
	const origPhdrLoadEndF = add(phdrLoadLast.pOffset, phdrLoadLast.pFilesz);
	for (const phdr of elf.programHeaders) {
		const endM = add(phdr.pVaddr, phdr.pMemsz);
		if (endM > origPhdrLoadEndM) {
			throw new Error('Program header memory after PT_LOAD');
		}
		const endF = add(phdr.pOffset, phdr.pFilesz);
		if (endF > origPhdrLoadEndF) {
			throw new Error('Program header data after PT_LOAD');
		}
	}

	// The .bss section header in 6.0.79.0 is weird.
	let allowBssAfterLoadData = false;
	if (elf.bits !== 64) {
		for (const shdr of elf.sectionHeaders) {
			if (shdr.shType !== SHT_STRTAB || shdr.shFlags !== SHF_ALLOC) {
				continue;
			}

			// Only FP6 uses this older library.
			const d = Buffer.from(shdr.data);
			allowBssAfterLoadData = d.indexOf('libgtk-1.2.so.0', 0) >= 0;
		}
	}

	// List the trailing unloaded section headers, sanity checked.
	let insertI = 0;
	let secnameI = 0;
	const unloaded = [];
	for (let i = 0; i < elf.sectionHeaders.length; i++) {
		const shdr = elf.sectionHeaders[i];
		if (shdr.shAddr) {
			insertI = i + 1;
			secnameI = shdr.shName;
			if (add(shdr.shAddr, shdr.shSize) > origPhdrLoadEndM) {
				throw new Error('Loaded section memory after PT_LOAD');
			}
			if (
				!(allowBssAfterLoadData && shdr.shType === SHT_NOBITS) &&
				add(shdr.shOffset, shdr.fileSize) > origPhdrLoadEndF
			) {
				throw new Error('Loaded section data after PT_LOAD');
			}
			continue;
		}
		if (shdr.shOffset) {
			if (shdr.shOffset < origPhdrLoadEndF) {
				throw new Error('Unloaded section data before end PT_LOAD');
			}
			unloaded.push(shdr);
		}
	}
	unloaded.sort((a, b) => Number(add(a.shOffset, -b.shOffset)));
	const shtrndx = elf.sectionHeaders[elf.elfHeader.eShtrndx];
	for (const d = new Uint8Array(shtrndx.data); d[secnameI++]; );

	// Insert new section names.
	const newData = new ArrayBuffer(
		shtrndx.data.byteLength + secnameDataS + secnameEofS
	);
	{
		const data = new Uint8Array(newData);
		let i = 0;
		for (const a of [
			new Uint8Array(shtrndx.data, 0, secnameI),
			secnameDataD,
			secnameEofD,
			new Uint8Array(shtrndx.data, secnameI)
		]) {
			data.set(a, i);
			i += a.length;
		}
	}
	shtrndx.data = newData;
	shtrndx.shSize =
		elf.bits === 64
			? BigInt(shtrndx.data.byteLength)
			: shtrndx.data.byteLength;
	for (const shdr of elf.sectionHeaders) {
		if (shdr.shName >= secnameI) {
			shdr.shName += secnameDataS + secnameEofS;
		}
	}

	// Insert new sections and section data.
	let sectionOffset = Number(add(phdrLoadLast.pOffset, phdrLoadLast.pMemsz));
	sectionOffset = align(sectionOffset, 64);
	const sectionAddrOffset = sectionOffset - Number(phdrLoadLast.pOffset);
	let dataSection = null;
	let eofSection = null;
	if (elf.bits === 64) {
		const dataS = new Elf64Shdr();
		dataS.shName = secnameI;
		dataS.shType = SHT_PROGBITS;
		dataS.shFlags = BigInt(SHF_ALLOC);
		dataS.shAddr = BigInt(phdrLoadLast.pVaddr) + BigInt(sectionAddrOffset);
		dataS.shOffset = BigInt(sectionOffset);
		dataS.shSize = BigInt(secdata.byteLength);
		dataS.shLink = 0;
		dataS.shInfo = 0;
		dataS.shAddralign = BigInt(aligned);
		dataS.shEntsize = 0n;
		dataS.data = secdata;
		elf.sectionHeaders.splice(insertI, 0, dataS);
		dataSection = dataS;

		const eofS = new Elf64Shdr();
		eofS.shName = secnameI + secnameDataS;
		eofS.shType = SHT_PROGBITS;
		eofS.shFlags = 0n;
		eofS.shAddr = 0n;
		eofS.shOffset = BigInt(elf.size);
		eofS.shSize = 0n;
		eofS.shLink = 0;
		eofS.shInfo = 0;
		eofS.shAddralign = 1n;
		eofS.shEntsize = 0n;
		elf.sectionHeaders.splice(insertI + 1, 0, eofS);
		eofSection = eofS;
	} else {
		const dataS = new Elf32Shdr();
		dataS.shName = secnameI;
		dataS.shType = SHT_PROGBITS;
		dataS.shFlags = SHF_ALLOC;
		dataS.shAddr = Number(phdrLoadLast.pVaddr) + sectionAddrOffset;
		dataS.shOffset = sectionOffset;
		dataS.shSize = secdata.byteLength;
		dataS.shLink = 0;
		dataS.shInfo = 0;
		dataS.shAddralign = aligned;
		dataS.shEntsize = 0;
		dataS.data = secdata;
		elf.sectionHeaders.splice(insertI, 0, dataS);
		dataSection = dataS;

		const eofS = new Elf32Shdr();
		eofS.shName = secnameI + secnameDataS;
		eofS.shType = SHT_PROGBITS;
		eofS.shFlags = 0;
		eofS.shAddr = 0;
		eofS.shOffset = elf.size;
		eofS.shSize = 0;
		eofS.shLink = 0;
		eofS.shInfo = 0;
		eofS.shAddralign = 1;
		elf.sectionHeaders.splice(insertI + 1, 0, eofS);
		eofSection = eofS;
	}
	elf.elfHeader.eShnum += 2;
	if (insertI <= elf.elfHeader.eShtrndx) {
		elf.elfHeader.eShtrndx += 2;
	}
	sectionOffset += secdata.byteLength;

	// Extend load header to cover the new section.
	phdrLoadLast.pFilesz = phdrLoadLast.pMemsz =
		elf.bits === 64
			? BigInt(sectionOffset - Number(phdrLoadLast.pOffset))
			: sectionOffset - Number(phdrLoadLast.pOffset);

	// Shift the unloaded section data and the section table forward.
	for (const shdr of unloaded) {
		if (shdr.shOffset < origPhdrLoadEndF) {
			continue;
		}
		sectionOffset = align(sectionOffset, Number(shdr.shAddralign));
		if (elf.bits === 64) {
			shdr.shOffset = BigInt(sectionOffset);
		} else {
			shdr.shOffset = Number(sectionOffset);
		}
		sectionOffset += Number(shdr.fileSize);
	}
	sectionOffset = align(sectionOffset, 16);
	if (elf.bits === 64) {
		elf.elfHeader.eShoff = BigInt(sectionOffset);
	} else {
		elf.elfHeader.eShoff = Number(sectionOffset);
	}

	// Linux projectors expect a section to cover the headers.
	// This is how the code finds the appended projector data.
	// For i386 the .bss section happens to do this before being modified.
	// For x86_64 this assumption is one of reasons that projectors are broken.
	// After the above modifications that poor assumption breaks.
	// To companstate update the added unloaded section to point to the end.
	eofSection.shOffset = elf.bits === 64 ? BigInt(elf.size) : elf.size;

	return dataSection;
}

export interface ILinuxProjectorPatch {
	/**
	 * Attempt to replace the window title if not null.
	 *
	 * @default null
	 */
	patchWindowTitle?: string | null;

	/**
	 * Attempt to patch out application menu.
	 *
	 * @default false
	 */
	patchMenuRemove?: boolean;

	/**
	 * Attempt to patch the projector path reading code.
	 *
	 * @default false
	 */
	patchProjectorPath?: boolean;

	/**
	 * Attempt to patch the projector offset reading code.
	 *
	 * @default false
	 */
	patchProjectorOffset?: boolean;
}

/**
 * Apply patches to projector.
 *
 * @param elf Projector data.
 * @param options Patch options.
 * @returns Patched projector.
 */
export function linuxProjectorPatch(
	elf: Readonly<Uint8Array>,
	options: Readonly<ILinuxProjectorPatch>
) {
	const {
		patchWindowTitle,
		patchMenuRemove,
		patchProjectorPath,
		patchProjectorOffset
	} = options;

	const e = decode(new DataView(elf.buffer, elf.byteOffset, elf.byteLength));

	const patchers = [] as [string, Patch<Elf32 | Elf64>[]][];
	if (typeof patchWindowTitle === 'string') {
		const titleData = Buffer.from(`${patchWindowTitle}\0`, 'utf8');
		const shdr = linuxProjectorAddSection(e, titleData);
		const titleA = shdr.shAddr;
		const titleL = titleData.length - 1;

		const patches =
			e.bits === 64
				? title64.map(Patch => new Patch(e, titleA as bigint, titleL))
				: title32.map(Patch => new Patch(e, titleA as number, titleL));
		patchers.push(['Window Title', patches]);
	}

	if (patchMenuRemove) {
		const patches =
			e.bits === 64
				? menu64.map(Patch => new Patch(e))
				: menu32.map(Patch => new Patch(e));
		patchers.push(['Menu Remove', patches]);
	}

	if (patchProjectorPath) {
		const patches =
			e.bits === 64
				? path64.map(Patch => new Patch(e))
				: path32.map(Patch => new Patch(e));
		patchers.push(['Projector Path', patches]);
	}

	if (patchProjectorOffset) {
		if (e.bits === 64) {
			const patches = offset64.map(Patch => new Patch(e));
			patchers.push(['Projector Offset', patches]);
		} else {
			throw new Error('Invalid configuration');
		}
	}

	for (const [type, patches] of patchers) {
		let found = null;
		for (const patch of patches) {
			if (patch.check()) {
				if (found) {
					throw new Error(`Multiple patch candidates for: ${type}`);
				}
				found = patch;
			}
		}
		if (!found) {
			throw new Error(`No patch candidates for: ${type}`);
		}
		found.patch();
	}

	return new Uint8Array(e.encoded());
}

/**
 * Get Linux launcher for the specified type.
 *
 * @param type Executable type.
 * @returns Launcher data.
 */
export async function linuxLauncher(type: 'i386' | 'x86_64') {
	switch (type) {
		case 'i386': {
			return launcher('linux-i386');
		}
		case 'x86_64': {
			return launcher('linux-x86_64');
		}
		default: {
			throw new Error(`Invalid type: ${type as string}`);
		}
	}
}

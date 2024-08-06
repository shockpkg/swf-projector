/* eslint-disable max-classes-per-file */

import {getBuffer, setBuffer} from '../data.ts';

export const ELFCLASS32 = 1;
export const ELFCLASS64 = 2;

export const ELFDATA2LSB = 1;
export const ELFDATA2MSB = 2;

export const EM_386 = 3;
export const EM_X86_64 = 62;

export const PT_NULL = 0;
export const PT_LOAD = 1;
export const PT_DYNAMIC = 2;
export const PT_INTERP = 3;
export const PT_NOTE = 4;
export const PT_SHLIB = 5;
export const PT_PHDR = 6;
export const PT_LOSUNW = 0x6ffffffa;
export const PT_SUNWBSS = 0x6ffffffb;
export const PT_SUNWSTACK = 0x6ffffffa;
export const PT_HISUNW = 0x6fffffff;
export const PT_LOPROC = 0x70000000;
export const PT_HIPROC = 0x7fffffff;

export const PF_NONE = 0x0;
export const PF_EXEC = 0x1;
export const PF_WRITE = 0x2;
export const PF_WRITE_EXEC = 0x3;
export const PF_READ = 0x4;
export const PF_READ_EXEC = 0x5;
export const PF_READ_WRITE = 0x6;
export const PF_READ_WRITE_EXEC = 0x7;

export const SHT_NULL = 0;
export const SHT_PROGBITS = 1;
export const SHT_SYMTAB = 2;
export const SHT_STRTAB = 3;
export const SHT_RELA = 4;
export const SHT_HASH = 5;
export const SHT_DYNAMIC = 6;
export const SHT_NOTE = 7;
export const SHT_NOBITS = 8;
export const SHT_REL = 9;
export const SHT_SHLIB = 10;
export const SHT_DYNSYM = 11;
export const SHT_SUNW_MOVE = 0x6ffffffa;
export const SHT_SUNW_COMDAT = 0x6ffffffb;
export const SHT_SUNW_SYMINFO = 0x6ffffffc;
export const SHT_SUNW_VERDEF = 0x6ffffffd;
export const SHT_SUNW_VERNEED = 0x6ffffffe;
export const SHT_SUNW_VERSYM = 0x6fffffff;
export const SHT_LOPROC = 0x70000000;
export const SHT_HIPROC = 0x7fffffff;
export const SHT_LOUSER = 0x80000000;
export const SHT_HIUSER = 0xffffffff;

export const SHF_WRITE = 0x1;
export const SHF_ALLOC = 0x2;
export const SHF_EXECINSTR = 0x4;
export const SHF_MASKPROC = 0xf0000000;

/**
 * Generic Linux ELF ident.
 */
export class EIdent {
	public eiId = new Uint8Array(4);

	public eiClass2 = 0;

	public eiData = 0;

	public eiVersion = 0;

	public eiOsabi = 0;

	public eiAbiversion = 0;

	public eiPad = new Uint8Array(6);

	public eiNident = 0;
}

/**
 * 32-bit Linux ELF ehdr.
 */
export class Elf32Ehdr {
	public eIdent = new EIdent();

	public eType = 0;

	public eMachine = 0;

	public eVersion = 0;

	public eEntry = 0;

	public ePhoff = 0;

	public eShoff = 0;

	public eFlags = 0;

	public eEhsize = 0;

	public ePhentsize = 0;

	public ePhnum = 0;

	public eShentsize = 0;

	public eShnum = 0;

	public eShtrndx = 0;
}

/**
 * 64-bit Linux ELF ehdr.
 */
export class Elf64Ehdr {
	public eIdent = new EIdent();

	public eType = 0;

	public eMachine = 0;

	public eVersion = 0;

	public eEntry = 0n;

	public ePhoff = 0n;

	public eShoff = 0n;

	public eFlags = 0;

	public eEhsize = 0;

	public ePhentsize = 0;

	public ePhnum = 0;

	public eShentsize = 0;

	public eShnum = 0;

	public eShtrndx = 0;
}

/**
 * 32-bit Linux ELF phdr.
 */
export class Elf32Phdr {
	public pType = 0;

	public pOffset = 0;

	public pVaddr = 0;

	public pPaddr = 0;

	public pFilesz = 0;

	public pMemsz = 0;

	public pFlags = 0;

	public pAlign = 0;
}

/**
 * 64-bit Linux ELF phdr.
 */
export class Elf64Phdr {
	public pType = 0;

	public pFlags = 0;

	public pOffset = 0n;

	public pVaddr = 0n;

	public pPaddr = 0n;

	public pFilesz = 0n;

	public pMemsz = 0n;

	public pAlign = 0n;
}

/**
 * 32-bit Linux ELF shdr.
 */
export class Elf32Shdr {
	public shName = 0;

	public shType = 0;

	public shFlags = 0;

	public shAddr = 0;

	public shOffset = 0;

	public shSize = 0;

	public shLink = 0;

	public shInfo = 0;

	public shAddralign = 0;

	public shEntsize = 0;

	public data = new ArrayBuffer(0);

	/**
	 * Get the section data file size.
	 *
	 * @returns File size.
	 */
	public get fileSize() {
		switch (this.shType) {
			case SHT_NULL:
			case SHT_NOBITS: {
				return 0;
			}
			default: {
				// Do nothing.
			}
		}
		return this.shSize;
	}
}

/**
 * 64-bit Linux ELF shdr.
 */
export class Elf64Shdr {
	public shName = 0;

	public shType = 0;

	public shFlags = 0n;

	public shAddr = 0n;

	public shOffset = 0n;

	public shSize = 0n;

	public shLink = 0;

	public shInfo = 0;

	public shAddralign = 0n;

	public shEntsize = 0n;

	public data = new ArrayBuffer(0);

	/**
	 * Get the section data file size.
	 *
	 * @returns File size.
	 */
	public get fileSize() {
		switch (this.shType) {
			case SHT_NULL:
			case SHT_NOBITS: {
				return 0n;
			}
			default: {
				// Do nothing.
			}
		}
		return this.shSize;
	}
}

/**
 * 32-bit Linux ELF format.
 */
export class Elf32 {
	public elfHeader = new Elf32Ehdr();

	public programHeaders = [] as Elf32Phdr[];

	public sectionHeaders = [] as Elf32Shdr[];

	/**
	 * Get format.
	 *
	 * @returns The number of bits.
	 */
	public get bits(): 32 {
		return 32;
	}

	/**
	 * Get endianness.
	 *
	 * @returns True if little endian, else false.
	 */
	public get littleEndian() {
		return this.elfHeader.eIdent.eiData === ELFDATA2LSB;
	}

	/**
	 * Get total encode size.
	 *
	 * @returns Total size.
	 */
	public get size() {
		const {elfHeader} = this;
		return Math.max(
			64,
			elfHeader.ePhoff + elfHeader.ePhnum * elfHeader.ePhentsize,
			elfHeader.eShoff + elfHeader.eShnum * elfHeader.eShentsize,
			// eslint-disable-next-line unicorn/no-array-reduce
			this.programHeaders.reduce(
				(i, p) => Math.max(p.pOffset + p.pFilesz, i),
				0
			),
			// eslint-disable-next-line unicorn/no-array-reduce
			this.sectionHeaders.reduce(
				(i, s) => Math.max(s.shOffset + s.fileSize, i),
				0
			)
		);
	}

	/**
	 * Decode from DataView.
	 *
	 * @param data Target DataView.
	 * @param offset The offset.
	 */
	public decode(data: Readonly<DataView>, offset = 0) {
		const elfHeader = (this.elfHeader = new Elf32Ehdr());
		const programHeaders = (this.programHeaders = [] as Elf32Phdr[]);
		const sectionHeaders = (this.sectionHeaders = [] as Elf32Shdr[]);
		const {eIdent} = elfHeader;

		eIdent.eiId[0] = data.getUint8(offset);
		eIdent.eiId[1] = data.getUint8(offset + 1);
		eIdent.eiId[2] = data.getUint8(offset + 2);
		eIdent.eiId[3] = data.getUint8(offset + 3);
		eIdent.eiClass2 = data.getUint8(offset + 4);
		eIdent.eiData = data.getUint8(offset + 5);
		eIdent.eiVersion = data.getUint8(offset + 6);
		eIdent.eiOsabi = data.getUint8(offset + 7);
		eIdent.eiAbiversion = data.getUint8(offset + 8);
		eIdent.eiPad[0] = data.getUint8(offset + 9);
		eIdent.eiPad[1] = data.getUint8(offset + 10);
		eIdent.eiPad[2] = data.getUint8(offset + 11);
		eIdent.eiPad[3] = data.getUint8(offset + 12);
		eIdent.eiPad[4] = data.getUint8(offset + 13);
		eIdent.eiPad[5] = data.getUint8(offset + 14);
		eIdent.eiNident = data.getUint8(offset + 15);

		const le = this.littleEndian;
		elfHeader.eType = data.getUint16(offset + 16, le);
		elfHeader.eMachine = data.getUint16(offset + 18, le);
		elfHeader.eVersion = data.getUint32(offset + 20, le);
		elfHeader.eEntry = data.getUint32(offset + 24, le);
		elfHeader.ePhoff = data.getUint32(offset + 28, le);
		elfHeader.eShoff = data.getUint32(offset + 32, le);
		elfHeader.eFlags = data.getUint32(offset + 36, le);
		elfHeader.eEhsize = data.getUint16(offset + 40, le);
		elfHeader.ePhentsize = data.getUint16(offset + 42, le);
		elfHeader.ePhnum = data.getUint16(offset + 44, le);
		elfHeader.eShentsize = data.getUint16(offset + 46, le);
		elfHeader.eShnum = data.getUint16(offset + 48, le);
		elfHeader.eShtrndx = data.getUint16(offset + 50, le);

		for (let i = 0; i < elfHeader.ePhnum; i++) {
			const o = offset + elfHeader.ePhoff + i * elfHeader.ePhentsize;
			const p = new Elf32Phdr();
			programHeaders.push(p);
			p.pType = data.getUint32(o, le);
			p.pOffset = data.getUint32(o + 4, le);
			p.pVaddr = data.getUint32(o + 8, le);
			p.pPaddr = data.getUint32(o + 12, le);
			p.pFilesz = data.getUint32(o + 16, le);
			p.pMemsz = data.getUint32(o + 20, le);
			p.pFlags = data.getUint32(o + 24, le);
			p.pAlign = data.getUint32(o + 28, le);
		}

		for (let i = 0; i < elfHeader.eShnum; i++) {
			const o = offset + elfHeader.eShoff + i * elfHeader.eShentsize;
			const s = new Elf32Shdr();
			sectionHeaders.push(s);
			s.shName = data.getUint32(o, le);
			s.shType = data.getUint32(o + 4, le);
			s.shFlags = data.getUint32(o + 8, le);
			s.shAddr = data.getUint32(o + 12, le);
			s.shOffset = data.getUint32(o + 16, le);
			s.shSize = data.getUint32(o + 20, le);
			s.shLink = data.getUint32(o + 24, le);
			s.shInfo = data.getUint32(o + 28, le);
			s.shAddralign = data.getUint32(o + 32, le);
			s.shEntsize = data.getUint32(o + 36, le);
			const {fileSize} = s;
			if (fileSize) {
				s.data = getBuffer(data, offset + s.shOffset, fileSize);
			}
		}
	}

	/**
	 * Encode into DataView.
	 *
	 * @param data Target DataView.
	 * @param offset The offset.
	 */
	public encode(data: DataView, offset = 0) {
		const {elfHeader, programHeaders, sectionHeaders} = this;
		const {eIdent} = elfHeader;

		data.setUint8(offset, eIdent.eiId[0]);
		data.setUint8(offset + 1, eIdent.eiId[1]);
		data.setUint8(offset + 2, eIdent.eiId[2]);
		data.setUint8(offset + 3, eIdent.eiId[3]);
		data.setUint8(offset + 4, eIdent.eiClass2);
		data.setUint8(offset + 5, eIdent.eiData);
		data.setUint8(offset + 6, eIdent.eiVersion);
		data.setUint8(offset + 7, eIdent.eiOsabi);
		data.setUint8(offset + 8, eIdent.eiAbiversion);
		data.setUint8(offset + 9, eIdent.eiPad[0]);
		data.setUint8(offset + 10, eIdent.eiPad[1]);
		data.setUint8(offset + 11, eIdent.eiPad[2]);
		data.setUint8(offset + 12, eIdent.eiPad[3]);
		data.setUint8(offset + 13, eIdent.eiPad[4]);
		data.setUint8(offset + 14, eIdent.eiPad[5]);
		data.setUint8(offset + 15, eIdent.eiNident);

		const le = this.littleEndian;
		data.setUint16(offset + 16, elfHeader.eType, le);
		data.setUint16(offset + 18, elfHeader.eMachine, le);
		data.setUint32(offset + 20, elfHeader.eVersion, le);
		data.setUint32(offset + 24, elfHeader.eEntry, le);
		data.setUint32(offset + 28, elfHeader.ePhoff, le);
		data.setUint32(offset + 32, elfHeader.eShoff, le);
		data.setUint32(offset + 36, elfHeader.eFlags, le);
		data.setUint16(offset + 40, elfHeader.eEhsize, le);
		data.setUint16(offset + 42, elfHeader.ePhentsize, le);
		data.setUint16(offset + 44, elfHeader.ePhnum, le);
		data.setUint16(offset + 46, elfHeader.eShentsize, le);
		data.setUint16(offset + 48, elfHeader.eShnum, le);
		data.setUint16(offset + 50, elfHeader.eShtrndx, le);

		for (let i = 0; i < elfHeader.ePhnum; i++) {
			const o = offset + elfHeader.ePhoff + i * elfHeader.ePhentsize;
			const p = programHeaders[i];
			data.setUint32(o, p.pType, le);
			data.setUint32(o + 4, p.pOffset, le);
			data.setUint32(o + 8, p.pVaddr, le);
			data.setUint32(o + 12, p.pPaddr, le);
			data.setUint32(o + 16, p.pFilesz, le);
			data.setUint32(o + 20, p.pMemsz, le);
			data.setUint32(o + 24, p.pFlags, le);
			data.setUint32(o + 28, p.pAlign, le);
		}

		for (let i = 0; i < elfHeader.eShnum; i++) {
			const o = offset + elfHeader.eShoff + i * elfHeader.eShentsize;
			const s = sectionHeaders[i];
			data.setUint32(o, s.shName, le);
			data.setUint32(o + 4, s.shType, le);
			data.setUint32(o + 8, s.shFlags, le);
			data.setUint32(o + 12, s.shAddr, le);
			data.setUint32(o + 16, s.shOffset, le);
			data.setUint32(o + 20, s.shSize, le);
			data.setUint32(o + 24, s.shLink, le);
			data.setUint32(o + 28, s.shInfo, le);
			data.setUint32(o + 32, s.shAddralign, le);
			data.setUint32(o + 36, s.shEntsize, le);
			const {fileSize} = s;
			if (fileSize) {
				setBuffer(data, offset + s.shOffset, s.data, fileSize);
			}
		}
	}

	/**
	 * Encoded as ArrayBuffer.
	 *
	 * @returns ArrayBuffer.
	 */
	public encoded() {
		const buffer = new ArrayBuffer(this.size);
		this.encode(new DataView(buffer));
		return buffer;
	}
}

/**
 * 64-bit Linux ELF format.
 */
export class Elf64 {
	public elfHeader = new Elf64Ehdr();

	public programHeaders = [] as Elf64Phdr[];

	public sectionHeaders = [] as Elf64Shdr[];

	/**
	 * Get format.
	 *
	 * @returns The number of bits.
	 */
	public get bits(): 64 {
		return 64;
	}

	/**
	 * Get endianness.
	 *
	 * @returns True if little endian, else false.
	 */
	public get littleEndian() {
		return this.elfHeader.eIdent.eiData === ELFDATA2LSB;
	}

	/**
	 * Get total encode size.
	 *
	 * @returns Total size.
	 */
	public get size() {
		const {elfHeader} = this;
		return Math.max(
			64,
			Number(elfHeader.ePhoff) + elfHeader.ePhnum * elfHeader.ePhentsize,
			Number(elfHeader.eShoff) + elfHeader.eShnum * elfHeader.eShentsize,
			// eslint-disable-next-line unicorn/no-array-reduce
			this.programHeaders.reduce(
				(i, p) => Math.max(Number(p.pOffset + p.pFilesz), i),
				0
			),
			// eslint-disable-next-line unicorn/no-array-reduce
			this.sectionHeaders.reduce(
				(i, s) => Math.max(Number(s.shOffset + s.fileSize), i),
				0
			)
		);
	}

	/**
	 * Decode from DataView.
	 *
	 * @param data Target DataView.
	 * @param offset The offset.
	 */
	public decode(data: Readonly<DataView>, offset = 0) {
		const elfHeader = (this.elfHeader = new Elf64Ehdr());
		const programHeaders = (this.programHeaders = [] as Elf64Phdr[]);
		const sectionHeaders = (this.sectionHeaders = [] as Elf64Shdr[]);
		const {eIdent} = elfHeader;

		eIdent.eiId[0] = data.getUint8(offset);
		eIdent.eiId[1] = data.getUint8(offset + 1);
		eIdent.eiId[2] = data.getUint8(offset + 2);
		eIdent.eiId[3] = data.getUint8(offset + 3);
		eIdent.eiClass2 = data.getUint8(offset + 4);
		eIdent.eiData = data.getUint8(offset + 5);
		eIdent.eiVersion = data.getUint8(offset + 6);
		eIdent.eiOsabi = data.getUint8(offset + 7);
		eIdent.eiAbiversion = data.getUint8(offset + 8);
		eIdent.eiPad[0] = data.getUint8(offset + 9);
		eIdent.eiPad[1] = data.getUint8(offset + 10);
		eIdent.eiPad[2] = data.getUint8(offset + 11);
		eIdent.eiPad[3] = data.getUint8(offset + 12);
		eIdent.eiPad[4] = data.getUint8(offset + 13);
		eIdent.eiPad[5] = data.getUint8(offset + 14);
		eIdent.eiNident = data.getUint8(offset + 15);

		const le = this.littleEndian;
		elfHeader.eType = data.getUint16(offset + 16, le);
		elfHeader.eMachine = data.getUint16(offset + 18, le);
		elfHeader.eVersion = data.getUint32(offset + 20, le);
		elfHeader.eEntry = data.getBigUint64(offset + 24, le);
		elfHeader.ePhoff = data.getBigUint64(offset + 32, le);
		elfHeader.eShoff = data.getBigUint64(offset + 40, le);
		elfHeader.eFlags = data.getUint32(offset + 48, le);
		elfHeader.eEhsize = data.getUint16(offset + 52, le);
		elfHeader.ePhentsize = data.getUint16(offset + 54, le);
		elfHeader.ePhnum = data.getUint16(offset + 56, le);
		elfHeader.eShentsize = data.getUint16(offset + 58, le);
		elfHeader.eShnum = data.getUint16(offset + 60, le);
		elfHeader.eShtrndx = data.getUint16(offset + 62, le);

		for (let i = 0; i < elfHeader.ePhnum; i++) {
			const o =
				offset + Number(elfHeader.ePhoff) + i * elfHeader.ePhentsize;
			const p = new Elf64Phdr();
			programHeaders.push(p);
			p.pType = data.getUint32(o, le);
			p.pFlags = data.getUint32(o + 4, le);
			p.pOffset = data.getBigUint64(o + 8, le);
			p.pVaddr = data.getBigUint64(o + 16, le);
			p.pPaddr = data.getBigUint64(o + 24, le);
			p.pFilesz = data.getBigUint64(o + 32, le);
			p.pMemsz = data.getBigUint64(o + 40, le);
			p.pAlign = data.getBigUint64(o + 48, le);
		}

		for (let i = 0; i < elfHeader.eShnum; i++) {
			const o =
				offset + Number(elfHeader.eShoff) + i * elfHeader.eShentsize;
			const s = new Elf64Shdr();
			sectionHeaders.push(s);
			s.shName = data.getUint32(o, le);
			s.shType = data.getUint32(o + 4, le);
			s.shFlags = data.getBigUint64(o + 8, le);
			s.shAddr = data.getBigUint64(o + 16, le);
			s.shOffset = data.getBigUint64(o + 24, le);
			s.shSize = data.getBigUint64(o + 32, le);
			s.shLink = data.getUint32(o + 40, le);
			s.shInfo = data.getUint32(o + 44, le);
			s.shAddralign = data.getBigUint64(o + 48, le);
			s.shEntsize = data.getBigUint64(o + 56, le);
			const {fileSize} = s;
			if (fileSize) {
				s.data = getBuffer(
					data,
					offset + Number(s.shOffset),
					Number(fileSize)
				);
			}
		}
	}

	/**
	 * Encode into DataView.
	 *
	 * @param data Target DataView.
	 * @param offset The offset.
	 */
	public encode(data: DataView, offset = 0) {
		const {elfHeader, programHeaders, sectionHeaders} = this;
		const {eIdent} = elfHeader;

		data.setUint8(offset, eIdent.eiId[0]);
		data.setUint8(offset + 1, eIdent.eiId[1]);
		data.setUint8(offset + 2, eIdent.eiId[2]);
		data.setUint8(offset + 3, eIdent.eiId[3]);
		data.setUint8(offset + 4, eIdent.eiClass2);
		data.setUint8(offset + 5, eIdent.eiData);
		data.setUint8(offset + 6, eIdent.eiVersion);
		data.setUint8(offset + 7, eIdent.eiOsabi);
		data.setUint8(offset + 8, eIdent.eiAbiversion);
		data.setUint8(offset + 9, eIdent.eiPad[0]);
		data.setUint8(offset + 10, eIdent.eiPad[1]);
		data.setUint8(offset + 11, eIdent.eiPad[2]);
		data.setUint8(offset + 12, eIdent.eiPad[3]);
		data.setUint8(offset + 13, eIdent.eiPad[4]);
		data.setUint8(offset + 14, eIdent.eiPad[5]);
		data.setUint8(offset + 15, eIdent.eiNident);

		const le = this.littleEndian;
		data.setUint16(offset + 16, elfHeader.eType, le);
		data.setUint16(offset + 18, elfHeader.eMachine, le);
		data.setUint32(offset + 20, elfHeader.eVersion, le);
		data.setBigUint64(offset + 24, elfHeader.eEntry, le);
		data.setBigUint64(offset + 32, elfHeader.ePhoff, le);
		data.setBigUint64(offset + 40, elfHeader.eShoff, le);
		data.setUint32(offset + 48, elfHeader.eFlags, le);
		data.setUint16(offset + 52, elfHeader.eEhsize, le);
		data.setUint16(offset + 54, elfHeader.ePhentsize, le);
		data.setUint16(offset + 56, elfHeader.ePhnum, le);
		data.setUint16(offset + 58, elfHeader.eShentsize, le);
		data.setUint16(offset + 60, elfHeader.eShnum, le);
		data.setUint16(offset + 62, elfHeader.eShtrndx, le);

		for (let i = 0; i < elfHeader.ePhnum; i++) {
			const o =
				offset + Number(elfHeader.ePhoff) + i * elfHeader.ePhentsize;
			const p = programHeaders[i];
			data.setUint32(o, p.pType, le);
			data.setUint32(o + 4, p.pFlags, le);
			data.setBigUint64(o + 8, p.pOffset, le);
			data.setBigUint64(o + 16, p.pVaddr, le);
			data.setBigUint64(o + 24, p.pPaddr, le);
			data.setBigUint64(o + 32, p.pFilesz, le);
			data.setBigUint64(o + 40, p.pMemsz, le);
			data.setBigUint64(o + 48, p.pAlign, le);
		}

		for (let i = 0; i < elfHeader.eShnum; i++) {
			const o =
				offset + Number(elfHeader.eShoff) + i * elfHeader.eShentsize;
			const s = sectionHeaders[i];
			data.setUint32(o, s.shName, le);
			data.setUint32(o + 4, s.shType, le);
			data.setBigUint64(o + 8, s.shFlags, le);
			data.setBigUint64(o + 16, s.shAddr, le);
			data.setBigUint64(o + 24, s.shOffset, le);
			data.setBigUint64(o + 32, s.shSize, le);
			data.setUint32(o + 40, s.shLink, le);
			data.setUint32(o + 44, s.shInfo, le);
			data.setBigUint64(o + 48, s.shAddralign, le);
			data.setBigUint64(o + 56, s.shEntsize, le);
			const {fileSize} = s;
			if (fileSize) {
				setBuffer(
					data,
					offset + Number(s.shOffset),
					s.data,
					Number(fileSize)
				);
			}
		}
	}

	/**
	 * Encoded as ArrayBuffer.
	 *
	 * @returns ArrayBuffer.
	 */
	public encoded() {
		const buffer = new ArrayBuffer(this.size);
		this.encode(new DataView(buffer));
		return buffer;
	}
}

/**
 * Decode based on format.
 *
 * @param data Data view.
 * @param offset Offset in data view.
 * @returns An instance.
 */
export function decode(data: Readonly<DataView>, offset = 0) {
	const eiClass2 = data.getUint8(offset + 4);
	switch (eiClass2) {
		case ELFCLASS32: {
			const elf = new Elf32();
			elf.decode(data, offset);
			return elf;
		}
		case ELFCLASS64: {
			const elf = new Elf64();
			elf.decode(data, offset);
			return elf;
		}
		default: {
			throw new Error(`Unknown eiClass2: ${eiClass2}`);
		}
	}
}

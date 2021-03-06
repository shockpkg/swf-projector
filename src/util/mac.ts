/* eslint-disable max-classes-per-file */

import {
	join as pathJoin
} from 'path';

import {
	Plist,
	Value,
	ValueDict,
	ValueString
} from '@shockpkg/plist-dom';
import {
	unsign
} from 'macho-unsign';
import fse from 'fs-extra';

import {
	once,
	launcher
} from '../util';

import {
	findExact,
	findFuzzy,
	patchHexToBytes
} from './internal/patch';

const FAT_MAGIC = 0xCAFEBABE;
const MH_MAGIC = 0xFEEDFACE;
const MH_CIGAM = 0xCEFAEDFE;
const MH_MAGIC_64 = 0xFEEDFACF;
const MH_CIGAM_64 = 0xCFFAEDFE;

const CPU_TYPE_POWERPC = 0x00000012;
const CPU_TYPE_POWERPC64 = 0x01000012;
const CPU_TYPE_I386 = 0x00000007;
const CPU_TYPE_X86_64 = 0x01000007;

const LC_SEGMENT = 1;

const launcherMappings = once(() => new Map([
	[CPU_TYPE_POWERPC, 'mac-app-ppc'],
	[CPU_TYPE_POWERPC64, 'mac-app-ppc64'],
	[CPU_TYPE_I386, 'mac-app-i386'],
	[CPU_TYPE_X86_64, 'mac-app-x86_64']
]));

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
 * Encode integer as 4 byte hex.
 *
 * @param i The integer to encode.
 * @returns Hex string.
 */
function hex4(i: number) {
	let r = i.toString(16);
	while (r.length < 8) {
		r = `0${r}`;
	}
	return r;
}

/**
 * Parse plist data.
 * Currently only supports XML plist.
 *
 * @param data Plist XML.
 * @returns Plist document.
 */
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
	return plistParse(await fse.readFile(path, 'utf8'));
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
	}
	else {
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
	return infoPlistDictGetValue(plist, 'CFBundleExecutable')
		.castAs(ValueString).value;
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
	return infoPlistDictGetValue(plist, 'CFBundleIconFile')
		.castAs(ValueString).value;
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
	const uint32 = (offset: number) => (
		le ? data.readUInt32LE(offset) : data.readUInt32BE(offset)
	);
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
	return machoTypesData(await fse.readFile(path));
}

/**
 * Unsign a Mach-O binary if signed.
 *
 * @param path Binary path.
 * @returns Returns true if signed, else false.
 */
export async function machoUnsignFile(path: string) {
	// Unsign data if signed.
	const unsigned = unsign(await fse.readFile(path));
	if (!unsigned) {
		return false;
	}

	// Write out the change.
	await fse.writeFile(path, Buffer.from(unsigned));
	return true;
}

/**
 * Unsign an application bundle.
 *
 * @param path Path to application bundle.
 */
export async function machoAppUnsign(path: string) {
	const contents = pathJoin(path, 'Contents');
	const executable = infoPlistBundleExecutableGet(
		await plistRead(pathJoin(contents, 'Info.plist'))
	);
	await Promise.all([
		machoUnsignFile(pathJoin(contents, 'MacOS', executable)),
		fse.remove(pathJoin(contents, 'CodeResources')),
		fse.remove(pathJoin(contents, '_CodeSignature'))
	]);
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
	// The lipo utility always uses 12/4096 for ppc, ppc64, i386, and x86_64.
	const align = 12;
	// eslint-disable-next-line no-bitwise
	const alignSize = (1 << align) >>> 0;

	// Create the FAT header.
	const head = Buffer.alloc(8);
	head.writeUInt32BE(FAT_MAGIC, 0);
	head.writeUInt32BE(types.length, 4);

	// The pieces and their total length.
	const pieces = [head];
	let total = head.length;

	// Helpers for add and pad pieces, updating the total length.
	const add = (data: Buffer) => {
		pieces.push(data);
		total += data.length;
	};
	const pad = () => {
		const over = total % alignSize;
		if (over) {
			add(Buffer.alloc(alignSize - over));
		}
	};

	// Create a head and get the body for each type.
	const parts = [];
	for (const type of types) {
		const head = Buffer.alloc(20);
		head.writeUInt32BE(type.cpuType, 0);
		head.writeUInt32BE(type.cpuSubtype, 4);
		head.writeUInt32BE(align, 16);
		parts.push({
			head,
			// eslint-disable-next-line no-await-in-loop
			body: await machoAppLauncherThin(type)
		});
		add(head);
	}

	// Add binaries aligned, updating their headers.
	for (const {head, body} of parts) {
		pad();
		head.writeUInt32BE(total, 8);
		head.writeUInt32BE(body.length, 12);
		add(body);
	}

	// Merge all the pieces.
	return Buffer.concat(pieces, total);
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
	return Array.isArray(types) ?
		machoAppLauncherFat(types) :
		machoAppLauncherThin(types as IMachoType);
}

/**
 * Read the binaries in a Mach-O binary which might be FAT.
 * Yields slices of the original buffer if a FAT binary.
 *
 * @param data Mach-O binary.
 */
export function * machoBinaries<T extends Readonly<Buffer>>(data: T) {
	if (data.readUInt32BE(0) === FAT_MAGIC) {
		const count = data.readUInt32BE(4);
		let offset = 8;
		for (let i = 0; i < count; i++) {
			const start = data.readUInt32BE(offset + 8);
			const end = start + data.readUInt32BE(offset + 12);
			yield data.subarray(start, end) as any as T;
			offset += 20;
		}
	}
	else {
		yield data;
	}
}

/**
 * Read an i386 Mach-O binary to get the base address.
 *
 * @param data Mach-O binary.
 * @returns Base address.
 */
function machoI386BaseAddress(data: Readonly<Buffer>) {
	const loadCommands = data.readUInt32LE(16);
	let offset = 28;
	for (let i = 0; i < loadCommands; i++) {
		const command = data.readUInt32LE(offset);
		const commandSize = data.readUInt32LE(offset + 4);
		if (command === LC_SEGMENT) {
			const segmentName = data.subarray(offset + 8, offset + 24);
			if (!segmentName.indexOf('__TEXT\0')) {
				return data.readUInt32LE(offset + 24);
			}
		}
		offset += commandSize;
	}
	throw new Error('Failed to locate __TEXT load command');
}

// These strings should not be used in a projector.
// Sorted longest to shortest.
const machoAppUnusedStrings = [
	'This application is not properly licensed to embed Adobe Flash Player.',
	'The installed version of Adobe Flash Player is too old.',
	'https://www.macromedia.com/bin/flashdownload.cgi'
];

abstract class MachoAppWindowTitlePatch extends Object {
	public static readonly CPU_TYPE: number;

	protected _data: Buffer;

	protected _title: string;

	protected _titleOffset = -1;

	protected _titleData: Buffer | null = null;

	constructor(data: Buffer, title: string) {
		super();

		this._data = data;
		this._title = title;
	}

	public abstract check(): boolean;

	public abstract patch(): void;

	protected _findFuzzyOnce(data: Buffer, fuzzy: (number | null)[]) {
		let r = null;
		for (const found of findFuzzy(data, fuzzy)) {
			if (r !== null) {
				throw new Error('Found multiple fuzzy matches');
			}
			r = found;
		}
		return r;
	}

	protected _findTitleMemory() {
		// Find the longest unused string match.
		let titleData = null;
		let titleOffset = -1;
		const data = this._data;
		OUTER:for (const str of machoAppUnusedStrings) {
			const strD = Buffer.from(`\0${str}\0`, 'ascii');
			for (const offset of findExact(data, strD)) {
				const off = offset + 1;
				titleData = data.subarray(off, off + strD.length - 1);
				titleOffset = off;
				break OUTER;
			}
		}
		if (!titleData) {
			throw new Error('No unused memory found');
		}
		const titleEncoded = this._titleEncoded();
		if (titleEncoded.length > titleData.length) {
			throw new Error('Encoded replacement window title too large');
		}
		this._titleOffset = titleOffset;
		this._titleData = titleData;
	}

	protected _patchTitleMemory() {
		const titleData = this._titleData;
		if (!titleData) {
			throw new Error('Internal error');
		}
		const titleEncoded = this._titleEncoded();
		titleData.fill(0);
		for (let i = titleEncoded.length; i--;) {
			titleData.writeInt8(titleEncoded.readInt8(i), i);
		}
	}

	protected _chars() {
		const r = this._titleOffset;
		if (r < 0) {
			throw new Error('Internal error');
		}
		return r;
	}

	protected _numChars() {
		return this._title.length;
	}

	protected abstract _titleEncoded(): Buffer;
}

abstract class MachoAppWindowTitlePatchI386 extends MachoAppWindowTitlePatch {
	public static readonly CPU_TYPE = CPU_TYPE_I386;

	protected _titleEncoded() {
		return Buffer.from(this._title, 'utf16le');
	}
}

abstract class MachoAppWindowTitlePatchX8664 extends MachoAppWindowTitlePatch {
	public static readonly CPU_TYPE = CPU_TYPE_X86_64;

	protected _titleEncoded() {
		return Buffer.from(this._title, 'utf16le');
	}
}

const machoAppWindowTitlePatches: ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	CPU_TYPE: number;
	new(data: Buffer, title: string): MachoAppWindowTitlePatch;
})[] = [
/* eslint-disable no-multi-spaces, line-comment-position, no-inline-comments */
	// 11.0.1.152+
	class extends MachoAppWindowTitlePatchI386 {
		private _offset_ = -1;

		public check() {
			const found = this._findFuzzyOnce(this._data, patchHexToBytes([
				'55',                      // push    ebp
				'89 E5',                   // mov     ebp, esp
				'56',                      // push    esi
				'53',                      // push    ebx
				'83 EC 10',                // sub     esp, 0x10
				'8B 75 08',                // mov     esi, DWORD PTR [ebp+0x8]
				'8B 45 0C',                // mov     eax, DWORD PTR [ebp+0xc]
				'8B 18',                   // mov     ebx, DWORD PTR [eax]
				'8B 48 04',                // mov     ecx, DWORD PTR [eax+0x4]
				'85 C9',                   // test    ecx, ecx
				'0F 44 0D -- -- -- --',    // cmove   ecx, DWORD PTR ds:...
				'89 5C 24 08',             // mov     DWORD PTR [esp+0x8], ebx
				'89 4C 24 04',             // mov     DWORD PTR [esp+0x4], ecx
				'8B 15 -- -- -- --',       // mov     edx, DWORD PTR ds:...
				'8B 02',                   // mov     eax, DWORD PTR [edx]
				'89 04 24',                // mov     DWORD PTR [esp], eax
				'E8 -- -- -- --'           // call    -- -- -- --
			].join(' ')));
			if (found === null) {
				return false;
			}

			this._findTitleMemory();
			this._offset_ = found;
			return true;
		}

		public patch() {
			this._patchTitleMemory();

			const d = this._data;
			let i = this._offset_ + 14;
			const base = machoI386BaseAddress(d);

			// mov ebx, numChars
			d.writeUInt8(0xBB, i++);
			d.writeInt32LE(this._numChars(), i);
			i += 4;

			// lea ecx, (base+chars)
			d.writeUInt8(0x8D, i++);
			d.writeUInt8(0x0D, i++);
			d.writeInt32LE(base + this._chars(), i);
			i += 4;

			// nop x3
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i);
		}
	},
	class extends MachoAppWindowTitlePatchX8664 {
		private _offset_ = -1;

		private _offsetJump_ = -1;

		public check() {
			const found = this._findFuzzyOnce(this._data, patchHexToBytes([
				'55',                      // push    rbp
				'48 89 E5',                // mov     rbp, rsp
				'41 54',                   // push    r12
				'53',                      // push    rbx
				'49 89 FC',                // mov     r12, rdi
				'48 8B 16',                // mov     rdx, QWORD PTR [rsi]
				'48 8B 76 08',             // mov     rsi, QWORD PTR [rsi+0x8]
				'48 85 F6',                // test    rsi, rsi
				'74 --',                   // je      --
				'48 8B 05 -- -- -- --',    // mov     rax, QWORD PTR [rip+...]
				'48 8B 38',                // mov     rdi, QWORD PTR [rax]
				'E8 -- -- -- --'           // call    -- -- -- --
			].join(' ')));
			if (found === null) {
				return false;
			}

			// Sanity check the jump target instructions.
			const offsetJump = found + 22 + this._data.readInt8(found + 21);
			if (this._findFuzzyOnce(
				this._data.subarray(offsetJump, offsetJump + 7),
				patchHexToBytes(
					'48 8D 35 -- -- -- --' // lea     rsi, [rip+...]
				)
			) !== 0) {
				throw new Error('Jump target instructions unexpected');
			}

			this._findTitleMemory();
			this._offset_ = found;
			this._offsetJump_ = offsetJump;
			return true;
		}

		public patch() {
			this._patchTitleMemory();

			const d = this._data;
			let i = this._offset_ + 10;

			// mov rdx, numChars
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0xBA, i++);
			d.writeInt32LE(this._numChars(), i);
			i += 4;
			d.writeInt32LE(0, i);
			i += 4;

			// jmp --
			d.writeUInt8(0xEB, i++);

			i = this._offsetJump_;

			// lea rsi, chars
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x8D, i++);
			d.writeUInt8(0x35, i++);
			d.writeInt32LE(this._chars() - (i + 4), i);
		}
	},
	// 13.0.0.182+
	class extends MachoAppWindowTitlePatchI386 {
		private _offset_ = -1;

		public check() {
			const found = this._findFuzzyOnce(this._data, patchHexToBytes([
				'55',                      // push    ebp
				'89 E5',                   // mov     ebp, esp
				'57',                      // push    edi
				'56',                      // push    esi
				'83 EC 10',                // sub     esp, 0x10
				'E8 00 00 00 00',          // call    0xd
				'5F',                      // pop     edi
				'8B 45 0C',                // mov     eax, DWORD PTR [ebp+0xc]
				'8B 08',                   // mov     ecx, DWORD PTR [eax]
				'8B 40 04',                // mov     eax, DWORD PTR [eax+0x4]
				'89 4C 24 08',             // mov     DWORD PTR [esp+0x8], ecx
				'85 C0',                   // test    eax, eax
				'0F 44 87 -- -- -- --',    // cmove   eax, DWORD PTR [edi+...]
				'89 44 24 04',             // mov     DWORD PTR [esp+0x4], eax
				'8B 87 -- -- -- --',       // mov     eax, DWORD PTR [edi+...]
				'8B 00',                   // mov     eax, DWORD PTR [eax]
				'89 04 24',                // mov     DWORD PTR [esp], eax
				'E8 -- -- -- --'           // call    -- -- -- --
			].join(' ')));
			if (found === null) {
				return false;
			}

			this._findTitleMemory();
			this._offset_ = found;
			return true;
		}

		public patch() {
			this._patchTitleMemory();

			const edi = this._offset_ + 13;
			const d = this._data;
			let i = this._offset_ + 17;

			// mov ecx, numChars
			d.writeUInt8(0xB9, i++);
			d.writeInt32LE(this._numChars(), i);
			i += 4;

			// mov DWORD PTR [esp+0x8], ecx
			i += 4;

			// lea eax, [edi+(chars-edi)]
			d.writeUInt8(0x8D, i++);
			d.writeUInt8(0x87, i++);
			d.writeInt32LE(this._chars() - edi, i);
			i += 4;

			// nop x3
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i);
		}
	},
	class extends MachoAppWindowTitlePatchX8664 {
		private _offset_ = -1;

		public check() {
			const found = this._findFuzzyOnce(this._data, patchHexToBytes([
				'55',                      // push    rbp
				'48 89 E5',                // mov     rbp, rsp
				'41 56',                   // push    r14
				'53',                      // push    rbx
				'49 89 FE',                // mov     r14, rdi
				'48 8B 16',                // mov     rdx, QWORD PTR [rsi]
				'48 8B 76 08',             // mov     rsi, QWORD PTR [rsi+0x8]
				'48 85 F6',                // test    rsi, rsi
				'48 0F 44 35 -- -- -- --', // cmove   rsi, QWORD PTR [rip+...]
				'48 8B 05 -- -- -- --',    // mov     rax, QWORD PTR [rip+...]
				'48 8B 38',                // mov     rdi, QWORD PTR [rax]
				'E8 -- -- -- --'           // call    -- -- -- --
			].join(' ')));
			if (found === null) {
				return false;
			}

			this._findTitleMemory();
			this._offset_ = found;
			return true;
		}

		public patch() {
			this._patchTitleMemory();

			const d = this._data;
			let i = this._offset_ + 10;

			// lea rsi, chars
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x8D, i++);
			d.writeUInt8(0x35, i++);
			d.writeInt32LE(this._chars() - (i + 4), i);
			i += 4;

			// mov rdx, numChars
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0xBA, i++);
			d.writeInt32LE(this._numChars(), i);
			i += 4;
			d.writeInt32LE(0, i);
			i += 4;

			// nop
			d.writeUInt8(0x90, i);
		}
	},
	// 23.0.0.162+
	class extends MachoAppWindowTitlePatchI386 {
		private _offset_ = -1;

		public check() {
			const found = this._findFuzzyOnce(this._data, patchHexToBytes([
				'55',                      // push    ebp
				'89 E5',                   // mov     ebp, esp
				'57',                      // push    edi
				'56',                      // push    esi
				'83 EC 10',                // sub     esp, 0x10
				'E8 00 00 00 00',          // call    0xd
				'5F',                      // pop     edi
				'8B 45 0C',                // mov     eax, DWORD PTR [ebp+0xc]
				'8B 8F -- -- -- --',       // mov     ecx, DWORD PTR [edi+...]
				'8B 09',                   // mov     ecx, DWORD PTR [ecx]
				'8B 10',                   // mov     edx, DWORD PTR [eax]
				'8B 40 04',                // mov     eax, DWORD PTR [eax+0x4]
				'85 C0',                   // test    eax, eax
				'0F 44 87 -- -- -- --',    // cmove   eax, DWORD PTR [edi+...]
				'89 54 24 08',             // mov     DWORD PTR [esp+0x8], edx
				'89 44 24 04',             // mov     DWORD PTR [esp+0x4], eax
				'89 0C 24',                // mov     DWORD PTR [esp], ecx
				'E8 -- -- -- --'           // call    -- -- -- --
			].join(' ')));
			if (found === null) {
				return false;
			}

			this._findTitleMemory();
			this._offset_ = found;
			return true;
		}

		public patch() {
			this._patchTitleMemory();

			const edi = this._offset_ + 13;
			const d = this._data;
			let i = this._offset_ + 25;

			// mov edx, numChars
			d.writeUInt8(0xBA, i++);
			d.writeInt32LE(this._numChars(), i);
			i += 4;

			// lea eax, [edi+(chars-edi)]
			d.writeUInt8(0x8D, i++);
			d.writeUInt8(0x87, i++);
			d.writeInt32LE(this._chars() - edi, i);
			i += 4;

			// nop x3
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i);
		}
	},
	class extends MachoAppWindowTitlePatchX8664 {
		private _offset_ = -1;

		public check() {
			const found = this._findFuzzyOnce(this._data, patchHexToBytes([
				'55',                      // push    rbp
				'48 89 E5',                // mov     rbp, rsp
				'41 56',                   // push    r14
				'53',                      // push    rbx
				'49 89 FE',                // mov     r14, rdi
				'48 8B 05 -- -- -- --',    // mov     rax, QWORD PTR [rip+...]
				'48 8B 38',                // mov     rdi, QWORD PTR [rax]
				'48 8B 16',                // mov     rdx, QWORD PTR [rsi]
				'48 8B 76 08',             // mov     rsi, QWORD PTR [rsi+0x8]
				'48 85 F6',                // test    rsi, rsi
				'48 0F 44 35 -- -- -- --', // cmove   rsi, QWORD PTR [rip+...]
				'E8 -- -- -- --'           // call    -- -- -- --
			].join(' ')));
			if (found === null) {
				return false;
			}

			this._findTitleMemory();
			this._offset_ = found;
			return true;
		}

		public patch() {
			this._patchTitleMemory();

			const d = this._data;
			let i = this._offset_ + 20;

			// lea rsi, chars
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x8D, i++);
			d.writeUInt8(0x35, i++);
			d.writeInt32LE(this._chars() - (i + 4), i);
			i += 4;

			// mov rdx, numChars
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0xBA, i++);
			d.writeInt32LE(this._numChars(), i);
			i += 4;
			d.writeInt32LE(0, i);
			i += 4;

			// nop
			d.writeUInt8(0x90, i);
		}
	}
/* eslint-enable no-multi-spaces, line-comment-position, no-inline-comments */
];

const machoAppWindowTitlePatchesByCpuType = once(() => {
	const r = new Map<number, (typeof machoAppWindowTitlePatches[0])[]>();
	for (const Patcher of machoAppWindowTitlePatches) {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const {CPU_TYPE} = Patcher;
		const list = r.get(CPU_TYPE) || [];
		list.push(Patcher);
		r.set(CPU_TYPE, list);
	}
	return r;
});

/**
 * Attempt to replace Mach-O app window title.
 *
 * @param data Projector data, maybe modified.
 * @param title Replacement title.
 * @returns Patched data, can be same buffer, but modified.
 */
export function machoAppWindowTitle(data: Buffer, title: string) {
	const pendingPatches: MachoAppWindowTitlePatch[] = [];
	for (const binary of machoBinaries(data)) {
		const magic = binary.readUInt32BE(0);
		let cpuType = 0;
		switch (magic) {
			case MH_MAGIC:
			case MH_MAGIC_64: {
				cpuType = binary.readUInt32BE(4);
				break;
			}
			case MH_CIGAM:
			case MH_CIGAM_64: {
				cpuType = binary.readUInt32LE(4);
				break;
			}
			default: {
				throw new Error(
					`Unknown header magic: 0x${hex4(magic)}`
				);
			}
		}
		const patchers = machoAppWindowTitlePatchesByCpuType()
			.get(cpuType) || [];
		let found: MachoAppWindowTitlePatch | null = null;
		for (const Patcher of patchers) {
			const patcher = new Patcher(binary, title);
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
		pendingPatches.push(found);
	}
	for (const patcher of pendingPatches) {
		patcher.patch();
	}
	return data;
}

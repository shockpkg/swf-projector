import {inflateRaw} from 'zlib';

import {launchers} from './launchers';

/**
 * Create return value once.
 *
 * @param create Create function.
 * @returns Returned value.
 */
export function once<T>(create: () => T): () => T {
	let called = false;
	let value: T;
	return () => {
		if (!called) {
			value = create();
			called = true;
		}
		return value;
	};
}

/**
 * Trim dot slash from head of path.
 *
 * @param path Path string.
 * @returns Trimmed path.
 */
export function trimDotSlash(path: string) {
	return path.replace(/^(\.\/)+/, '');
}

/**
 * Find path relative from base, if base matches.
 *
 * @param path Path to match against.
 * @param start Search start.
 * @param nocase Match case-insensitive.
 * @returns Returns path, or null.
 */
export function pathRelativeBase(path: string, start: string, nocase = false) {
	const p = trimDotSlash(nocase ? path.toLowerCase() : path);
	const s = trimDotSlash(nocase ? start.toLowerCase() : start);
	if (p === s) {
		return '';
	}
	if (p.startsWith(`${s}/`)) {
		return path.substring(s.length + 1);
	}
	return null;
}

/**
 * Same as pathRelativeBase, but retuns true on a match, else false.
 *
 * @param path Path to match against.
 * @param start Search start.
 * @param nocase Match case-insensitive.
 * @returns Returns true on match, else false.
 */
export function pathRelativeBaseMatch(
	path: string,
	start: string,
	nocase = false
) {
	return pathRelativeBase(path, start, nocase) !== null;
}

/**
 * Trim a file extenion.
 *
 * @param path File path.
 * @param ext File extension.
 * @param nocase Match case-insensitive.
 * @returns Path without file extension.
 */
export function trimExtension(path: string, ext: string, nocase = false) {
	const p = nocase ? path.toLowerCase() : path;
	const e = nocase ? ext.toLowerCase() : ext;
	return p.endsWith(e) ? path.substring(0, p.length - e.length) : path;
}

/**
 * Encode integer as 4 byte hex.
 *
 * @param i The integer to encode.
 * @returns Hex string.
 */
export function hex4(i: number) {
	let r = i.toString(16);
	while (r.length < 8) {
		r = `0${r}`;
	}
	return r;
}

/**
 * Get UINT32 from data.
 *
 * @param data Data buffer.
 * @param i Integer offset.
 * @param le Little endia if true.
 * @returns UINT32 value.
 */
export function getU32(data: Readonly<Buffer>, i: number, le: boolean) {
	return le ? data.readUInt32LE(i) : data.readUInt32BE(i);
}

/**
 * Set UINT32 in data.
 *
 * @param data Data buffer.
 * @param i Integer offset.
 * @param le Little endia if true.
 * @param value UINT32 value.
 */
export function setU32(data: Buffer, i: number, le: boolean, value: number) {
	if (le) {
		data.writeUInt32LE(value, i);
	} else {
		data.writeUInt32BE(value, i);
	}
}

/**
 * Get UINT64 from data.
 * Returns inexact value where larger than max safe int value.
 *
 * @param data Data buffer.
 * @param i Integer offset.
 * @param le Little endia if true.
 * @returns UINT64 value.
 */
export function getU64(data: Readonly<Buffer>, i: number, le: boolean) {
	const l = le ? data.readUInt32LE(i) : data.readUInt32BE(i + 4);
	const h = le ? data.readUInt32LE(i + 4) : data.readUInt32BE(i);
	return h * 0x100000000 + l;
}

/**
 * Set UINT64 in data.
 *
 * @param data Data buffer.
 * @param i Integer offset.
 * @param le Little endia if true.
 * @param value UINT64 value.
 */
export function setU64(data: Buffer, i: number, le: boolean, value: number) {
	const l = value % 0x100000000;
	const h = value > l ? (value - l) / 0x100000000 : 0;
	if (le) {
		data.writeUInt32LE(h, i + 4);
		data.writeUInt32LE(l, i);
	} else {
		data.writeUInt32BE(l, i + 4);
		data.writeUInt32BE(h, i);
	}
}

/**
 * Get C-String with a max length.
 *
 * @param data Data buffer.
 * @param i Integer offset.
 * @param l Max length.
 * @returns ASCII string.
 */
export function getCstrN(data: Readonly<Buffer>, i: number, l: number) {
	const codes = [];
	for (let c = 0; c < l; c++) {
		const code = data.readUint8(i + c);
		if (!code) {
			break;
		}
		codes.push(code);
	}
	return String.fromCharCode(...codes);
}

/**
 * Align integer.
 *
 * @param i Integer value.
 * @param align Alignment amount.
 * @returns Aligned integer.
 */
export function align(i: number, align: number) {
	const o = i % align;
	return o ? align - o + i : i;
}

/**
 * Align Buffer.
 *
 * @param buffer Buffer instance.
 * @param align Align amount.
 * @returns Aligned buffer, or same buffer if already aligned.
 */
export function bufferAlign(buffer: Readonly<Buffer>, align: number) {
	const o = buffer.length % align;
	return o ? Buffer.concat([buffer, Buffer.alloc(align - o)]) : buffer;
}

/**
 * Get ArrayBuffer from Buffer.
 *
 * @param buffer Buffer instance.
 * @returns ArrayBuffer copy.
 */
export function bufferToArrayBuffer(buffer: Readonly<Buffer>) {
	const {byteOffset, byteLength} = buffer;
	return buffer.buffer.slice(byteOffset, byteOffset + byteLength);
}

/**
 * Get launcher data for an ID.
 *
 * @param id Laucher ID.
 * @returns Launcher data.
 */
export async function launcher(id: string) {
	const b64 = launchers()[id];
	if (typeof b64 !== 'string') {
		throw new Error(`Invalid launcher id: ${id}`);
	}

	return new Promise<Buffer>((resolve, reject) => {
		inflateRaw(Buffer.from(b64, 'base64'), (err, data) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(data);
		});
	});
}

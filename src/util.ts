import zlib from 'zlib';

import {LAUNCHERS} from './launchers';

/**
 * Default value if value is undefined.
 *
 * @param value Value.
 * @param defaultValue Default value.
 * @returns Value or the default value if undefined.
 */
export function defaultValue<T, U>(
	value: T,
	defaultValue: U
): Exclude<T, undefined> | U {
	return (typeof value === 'undefined') ?
		defaultValue :
		(value as Exclude<T, undefined>);
}

/**
 * Default null if value is undefined.
 *
 * @param value Value.
 * @returns Value or null if undefined.
 */
export function defaultNull<T>(value: T) {
	return defaultValue(value, null);
}

/**
 * Default false if value is undefined.
 *
 * @param value Value.
 * @returns Value or false if undefined.
 */
export function defaultFalse<T>(value: T) {
	return defaultValue(value, false);
}

/**
 * Default true if value is undefined.
 *
 * @param value Value.
 * @returns Value or true if undefined.
 */
export function defaultTrue<T>(value: T) {
	return defaultValue(value, true);
}

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
export function pathRelativeBase(
	path: string,
	start: string,
	nocase = false
) {
	const p = trimDotSlash(nocase ? path.toLowerCase() : path);
	const s = trimDotSlash(nocase ? start.toLowerCase() : start);
	if (p === s) {
		return '';
	}
	if (p.startsWith(`${s}/`)) {
		return path.substr(s.length + 1);
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
export function trimExtension(
	path: string,
	ext: string,
	nocase = false
) {
	const p = nocase ? path.toLowerCase() : path;
	const e = nocase ? ext.toLowerCase() : ext;
	return p.endsWith(e) ? path.substr(0, p.length - e.length) : path;
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
	const b64 = LAUNCHERS[id];
	if (typeof b64 !== 'string') {
		throw new Error(`Invalid launcher id: ${id}`);
	}

	return new Promise<Buffer>((resolve, reject) => {
		zlib.inflateRaw(Buffer.from(b64, 'base64'), (err, data) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(data);
		});
	});
}

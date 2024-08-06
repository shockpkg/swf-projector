import {inflateRaw} from 'node:zlib';

import {LAUNCHERS} from './launchers.ts';

/**
 * HTML encode.
 *
 * @param s Raw strings.
 * @param dq Double quotes.
 * @param sq Single quotes.
 * @returns Encoded strings.
 */
export function htmlEncode(s: string, dq = false, sq = false) {
	s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	if (dq) {
		s = s.replace(/"/g, '&quot;');
	}
	if (sq) {
		s = s.replace(/'/g, '&#39;');
	}
	return s;
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
		return path.slice(s.length + 1);
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
	return p.endsWith(e) ? path.slice(0, p.length - e.length) : path;
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
		// eslint-disable-next-line unicorn/prefer-type-error
		throw new Error(`Invalid launcher id: ${id}`);
	}

	return new Promise<Uint8Array>((resolve, reject) => {
		inflateRaw(Buffer.from(b64, 'base64'), (err, data) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(
				new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
			);
		});
	});
}

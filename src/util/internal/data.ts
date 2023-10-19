/**
 * Encode integer as 4 byte hex.
 *
 * @param i The integer to encode.
 * @returns Hex string.
 */
export function hex4(i: number) {
	return i.toString(16).padStart(8, '0');
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
 * Concat data chunks together.
 *
 * @param pieces The pieces to merge.
 * @returns Merged data.
 */
export function concat(pieces: Readonly<Readonly<Uint8Array>[]>) {
	let l = 0;
	for (const piece of pieces) {
		l += piece.length;
	}
	const r = new Uint8Array(l);
	l = 0;
	for (const piece of pieces) {
		r.set(piece, l);
		l += piece.length;
	}
	return r;
}

/**
 * Get buffer.
 *
 * @param data Data view.
 * @param offset The offset.
 * @param size The size.
 * @returns ArrayBuffer slice.
 */
export function getBuffer(data: Readonly<DataView>, offset: number, size = -1) {
	const {byteOffset, byteLength} = data;
	const o = byteOffset + offset;
	const l = byteLength - byteOffset;
	if (size > l) {
		throw new Error(`Size out of bounds`);
	}
	return data.buffer.slice(o, o + (size < 0 ? l : size));
}

/**
 * Set buffer.
 *
 * @param data Data view.
 * @param offset The offset.
 * @param buffer The ArrayBuffer.
 * @param size The size.
 */
export function setBuffer(
	data: DataView,
	offset: number,
	buffer: Readonly<ArrayBuffer>,
	size = -1
) {
	const {byteOffset, byteLength} = data;
	const o = byteOffset + offset;
	new Uint8Array(data.buffer, o, byteLength - o).set(
		new Uint8Array(buffer, 0, size < 0 ? buffer.byteLength : size)
	);
}

/**
 * Find exact match in data.
 *
 * @param data Data to search.
 * @param find Search for.
 * @param from Search from.
 * @returns Index.
 */
export function findIndex(
	data: Readonly<Uint8Array>,
	find: Readonly<Uint8Array>,
	from = 0
) {
	const l = find.length;
	if (l) {
		const e = data.length - l;
		const [f] = find;
		for (let i = from; ; i++) {
			i = data.indexOf(f, i);
			if (i < 0 || i > e) {
				break;
			}
			let m = true;
			for (let j = 1; j < l; j++) {
				if (data[i + j] !== find[j]) {
					m = false;
					break;
				}
			}
			if (m) {
				return i;
			}
		}
	}
	return -1;
}

/**
 * Get C-String with a max length.
 *
 * @param data Data buffer.
 * @param i Integer offset.
 * @param l Max length.
 * @returns ASCII string.
 */
export function getCstrN(data: Readonly<Uint8Array>, i: number, l: number) {
	let c = 0;
	for (; c < l; c++) {
		if (!data[i + c]) {
			break;
		}
	}
	return String.fromCharCode(...data.subarray(i, i + c));
}

/**
 * Encode string as UTF-16.
 *
 * @param str The string to encode.
 * @param le Little endian.
 * @returns Encoded data.
 */
export function encodeUtf16(str: string, le = false) {
	const l = str.length;
	const d = new ArrayBuffer(l * 2);
	const v = new DataView(d);
	for (let i = 0; i < l; i++) {
		v.setUint16(i * 2, str.charCodeAt(i), le);
	}
	return new Uint8Array(d);
}

/**
 * Get UTF16 string from data buffer.
 *
 * @param data Data buffer.
 * @param i Start index.
 * @param le Little endian.
 * @returns Decoded string or null if never null terminated.
 */
export function getUtf16(data: Readonly<Uint8Array>, i: number, le = false) {
	const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const e = v.byteLength - 1;
	for (const a = []; i < e; i += 2) {
		const c = v.getUint16(i, le);
		if (!c) {
			return String.fromCharCode(...a);
		}
		a.push(c);
	}
	return null;
}

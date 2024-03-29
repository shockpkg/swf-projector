/**
 * Set subview of an existing buffer.
 *
 * @param data Data to get a subview of.
 * @param start Start offset.
 * @param size Subview size.
 * @returns Data subview.
 */
export function subview(data: Uint8Array, start: number, size = -1) {
	size = size < 0 ? data.length - start : size;
	const r = data.subarray(start, start + size);
	if (r.length < size) {
		throw new Error(`Data is too small: ${r.length} < ${size}`);
	}
	return r;
}

/**
 * Encode a string as a C-String.
 *
 * @param str String to be encoded.
 * @returns Encoded string.
 */
export function stringEncode(str: string) {
	return new TextEncoder().encode(`${str}\0`);
}

/**
 * Get number of bits needed to encode an unsigned integer.
 *
 * @param i Integer, unsigned.
 * @returns The number of bits.
 */
export function bitCountU(i: number) {
	let n = 0;
	// eslint-disable-next-line no-bitwise
	for (; i; i >>= 1) {
		n++;
	}
	return n;
}

/**
 * Get number of bits needed to encode a signed integer.
 *
 * @param i Integer, signed.
 * @returns The number of bits.
 */
export function bitCountS(i: number) {
	// eslint-disable-next-line no-bitwise
	return bitCountU(i < 0 ? i ^ -1 : i) + 1;
}

/**
 * Get the number of bytes needed to store N bit.
 *
 * @param bits The number of bits.
 * @returns The number of bytes.
 */
export function bitCountToBytes(bits: number) {
	const over = bits % 8;
	return (bits - over) / 8 + (over ? 1 : 0);
}

/**
 * Create a bit writer function for a buffer at offset.
 *
 * @param data The buffer to write bits into.
 * @param start Start offset.
 * @returns Writter function (value, count, offset).
 */
export function bitWriter(data: Uint8Array, start = 0) {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	return (v: number, c: number, b: number) => {
		for (let i = 0; i < c; i++) {
			const bI = b + i;
			const bitI = bI % 8;
			const byteI = (bI - bitI) / 8;
			let byteV = view.getUint8(start + byteI);
			// eslint-disable-next-line no-bitwise
			const flag = 1 << (7 - bitI);
			// eslint-disable-next-line no-bitwise
			if ((v >> (c - 1 - i)) & 1) {
				// eslint-disable-next-line no-bitwise
				byteV |= flag;
			} else {
				// eslint-disable-next-line no-bitwise
				byteV &= ~flag;
			}
			view.setUint8(start + byteI, byteV);
		}
	};
}

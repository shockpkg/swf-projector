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

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
 * @param le Little endian if true.
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
 * @param le Little endian if true.
 * @param value UINT32 value.
 */
export function setU32(
	data: Buffer,
	i: number,
	le: boolean,
	value: number | bigint
) {
	if (le) {
		data.writeUInt32LE(Number(value), i);
	} else {
		data.writeUInt32BE(Number(value), i);
	}
}

/**
 * Get UINT64 from data.
 * Returns inexact value where larger than max safe int value.
 *
 * @param data Data buffer.
 * @param i Integer offset.
 * @param le Little endian if true.
 * @returns UINT64 value.
 */
export function getU64(data: Readonly<Buffer>, i: number, le: boolean) {
	return le ? data.readBigInt64LE(i) : data.readBigInt64BE(i);
}

/**
 * Set UINT64 in data.
 *
 * @param data Data buffer.
 * @param i Integer offset.
 * @param le Little endian if true.
 * @param value UINT64 value.
 */
export function setU64(
	data: Buffer,
	i: number,
	le: boolean,
	value: bigint | number
) {
	if (le) {
		data.writeBigInt64LE(BigInt(value), i);
	} else {
		data.writeBigInt64BE(BigInt(value), i);
	}
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
 * Align a big integer.
 *
 * @param i Integer value.
 * @param align Alignment amount.
 * @returns Aligned integer.
 */
export function alignBig(i: bigint, align: number | bigint) {
	const a = BigInt(align);
	const o = i % a;
	return o ? a - o + i : i;
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
 * Get DataView from Buffer.
 *
 * @param buffer Buffer instance.
 * @returns The DataView.
 */
export function bufferToDataView(buffer: Readonly<Buffer>) {
	const {byteOffset, byteLength} = buffer;
	return new DataView(
		buffer.buffer,
		byteOffset,
		byteLength
	) as Readonly<DataView>;
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
	const l = byteLength - byteOffset;
	if (size > l) {
		throw new Error(`Size out of bounds`);
	}
	return data.buffer.slice(offset, offset + (size < 0 ? l : size));
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
	data: Readonly<DataView>,
	offset: number,
	buffer: Readonly<ArrayBuffer>,
	size = -1
) {
	const {byteOffset, byteLength} = data;
	const o = byteOffset + offset;
	const s = new Uint8Array(buffer, 0, size < 0 ? buffer.byteLength : size);
	const d = new Uint8Array(data.buffer, o, byteLength - o);
	d.set(s);
}

/**
 * Find exact matches in data.
 *
 * @param data Data to search.
 * @param find Search for.
 * @param from Search from.
 * @yields Index.
 */
export function* findExact(
	data: Readonly<Buffer>,
	find: Readonly<Buffer> | string | Readonly<Uint8Array>,
	from = 0
) {
	for (let index = from - 1; ; ) {
		index = data.indexOf(find, index + 1);
		if (index < 0) {
			break;
		}
		yield index;
	}
}

/**
 * Find similar matches in data.
 *
 * @param data Data to search.
 * @param find Search for.
 * @param from Search from.
 * @param until Search until.
 * @param backward Search backwards.
 * @yields Index.
 */
export function* findFuzzy(
	data: Readonly<Buffer>,
	find: (number | null)[],
	from = 0,
	until = -1,
	backward = false
) {
	const end = (until < 0 ? data.length : until) - find.length;
	const add = backward ? -1 : 1;
	const stop = backward ? 0 : end;
	for (let i = backward ? end : from; i !== stop; i += add) {
		let found = true;
		for (let j = 0; j < find.length; j++) {
			const b = find[j];
			if (b !== null && data[i + j] !== b) {
				found = false;
				break;
			}
		}
		if (found) {
			yield i;
		}
	}
}

/**
 * Fuzzy find once, null if multiple.
 *
 * @param data Data.
 * @param fuzzy Fuzzy data.
 * @returns Index or null.
 */
export function findFuzzyOnce(
	data: Readonly<Buffer>,
	fuzzy: (number | null)[]
) {
	let r = null;
	for (const found of findFuzzy(data, fuzzy)) {
		if (r !== null) {
			return null;
		}
		r = found;
	}
	return r;
}

/**
 * Write similar match in data.
 *
 * @param data Data to write into.
 * @param offset Offset to write at.
 * @param fuzzy The similar data.
 */
export function writeFuzzy(
	data: Buffer,
	offset: number,
	fuzzy: (number | null)[]
) {
	for (let i = 0; i < fuzzy.length; i++) {
		const b = fuzzy[i];
		if (b !== null) {
			data[offset + i] = b;
		}
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
 * Converts a hex string into a series of byte values, with unknowns being null.
 *
 * @param str Hex string.
 * @returns Bytes and null values.
 */
export function patchHexToBytes(str: string) {
	return (str.replace(/[\s\r\n]/g, '').match(/.{1,2}/g) || []).map(s => {
		if (s.length !== 2) {
			throw new Error('Internal error');
		}
		return /[0-9A-F]{2}/i.test(s) ? parseInt(s, 16) : null;
	});
}

/**
 * Find the offsets for the patches in a group.
 *
 * @param data Data buffer.
 * @param patches Patches group.
 * @returns The offsets or null.
 */
export function patchGroupOffsets(
	data: Readonly<Buffer>,
	patches: {
		count: number;
		find: (number | null)[];
		replace: (number | null)[];
	}[]
) {
	const offsets = [];
	for (const {find, count} of patches) {
		const found = [...findFuzzy(data, find)];
		if (found.length !== count) {
			return null;
		}
		offsets.push(found);
	}
	return offsets;
}

/**
 * Patch one group and only from list of patch groups.
 *
 * @param data Data to be patched.
 * @param patches Patches list.
 */
export function patchOnce(
	data: Buffer,
	patches: {
		count: number;
		find: (number | null)[];
		replace: (number | null)[];
	}[][]
) {
	// Search the buffer for patch candidates.
	let foundOffsets = null;
	let foundGroup = null;
	for (const group of patches) {
		const offsets = patchGroupOffsets(data, group);
		if (!offsets) {
			continue;
		}
		if (foundOffsets) {
			throw new Error('Multiple patch candidates found');
		}
		foundOffsets = offsets;
		foundGroup = group;
	}
	if (!foundGroup || !foundOffsets) {
		throw new Error('No patch candidates found');
	}

	// Apply the patches to the buffer.
	for (let i = 0; i < foundGroup.length; i++) {
		for (const offset of foundOffsets[i]) {
			writeFuzzy(data, offset, foundGroup[i].replace);
		}
	}
}

/**
 * Search data for string, yields indexes and strings.
 *
 * @param data Data to search.
 * @param pre String prefix to search for.
 * @param enc String encoding.
 * @param reg Regex strings must match.
 * @yields String entry.
 */
export function* dataStrings(
	data: Readonly<Buffer>,
	pre: string,
	enc: 'ascii' | 'utf8' | 'utf16le' | 'ucs2' | 'latin1',
	reg: RegExp | null = null
) {
	const nulled = Buffer.from('\0', enc);
	const bytes = nulled.length;
	const preSize = pre.length * bytes;
	for (const index of findExact(data, Buffer.from(pre, enc))) {
		let more = 0;
		for (more of findExact(data.subarray(index + preSize), nulled)) {
			if (!(more % bytes)) {
				break;
			}
		}
		const stringData = data.subarray(index, index + preSize + more);
		const string = stringData.toString(enc);
		if (reg && !reg.test(string)) {
			continue;
		}
		yield {
			index,
			data: stringData,
			string
		};
	}
}

/**
 * A utility to slide values within a window.
 *
 * @param amount The amount to slide.
 * @param offset Window offset.
 * @param size Window size.
 * @returns Sliding functions.
 */
export function slider(amount: number, offset: number, size: number) {
	const end = offset + size;
	return {
		/**
		 * For UINT32.
		 *
		 * @param data Buffer data.
		 * @param i Integer offset.
		 * @param le Little endian if true.
		 */
		u32: (data: Buffer, i: number, le: boolean) => {
			const v = getU32(data, i, le);
			if (v >= offset && v <= end) {
				setU32(data, i, le, v + amount);
			}
		}
	};
}

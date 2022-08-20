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
		index = data.indexOf(find as unknown as Buffer, index + 1);
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
 * @yields Index.
 */
export function* findFuzzy(
	data: Readonly<Buffer>,
	find: (number | null)[],
	from = 0
) {
	const end = data.length - find.length;
	for (let i = from; i <= end; i++) {
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
 * Read a C string from buffer at offset.
 * Returns slice of the buffer.
 *
 * @param data The buffer.
 * @param offset Offset of the string.
 * @param includeNull Optionally include null byte.
 * @param includeAlign Optionally include allignment bytes.
 * @returns Buffer slice.
 */
export function getCstr(
	data: Readonly<Buffer>,
	offset: number,
	includeNull = false,
	includeAlign = false
) {
	let end = offset;
	while (data.readUInt8(end)) {
		end++;
	}
	if (includeNull) {
		end++;
		if (includeAlign) {
			while (!data.readUInt8(end)) {
				end++;
			}
		}
	}
	return data.subarray(offset, end);
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

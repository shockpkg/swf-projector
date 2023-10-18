import {findIndex} from './data';

/**
 * Find exact matches in data.
 *
 * @param data Data to search.
 * @param find Search for.
 * @param from Search from.
 * @yields Index.
 */
export function* findExact(
	data: Readonly<Uint8Array>,
	find: Readonly<Uint8Array>,
	from = 0
) {
	for (let index = from - 1; ; ) {
		index = findIndex(data, find, index + 1);
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
	data: Readonly<Uint8Array>,
	find: (number | null)[],
	from = 0,
	until = -1,
	backward = false
) {
	const end = (until < 0 ? data.length : until) - find.length;
	const add = backward ? -1 : 1;
	const stop = backward ? -1 : end + 1;
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
	data: Readonly<Uint8Array>,
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
	data: Uint8Array,
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
		return /^[0-9A-F]{2}$/i.test(s) ? parseInt(s, 16) : null;
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
	data: Readonly<Uint8Array>,
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
 * @param type Patch type.
 */
export function patchOnce(
	data: Uint8Array,
	patches: {
		count: number;
		find: (number | null)[];
		replace: (number | null)[];
	}[][],
	type: string
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
			throw new Error(`Multiple patch candidates for: ${type}`);
		}
		foundOffsets = offsets;
		foundGroup = group;
	}
	if (!foundGroup || !foundOffsets) {
		throw new Error(`No patch candidates for: ${type}`);
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
		yield [index, stringData, string] as [number, Buffer, string];
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
		 * @param data Data view.
		 * @param i Integer offset.
		 * @param le Little endian if true.
		 */
		u32: (data: DataView, i: number, le: boolean) => {
			const v = data.getUint32(i, le);
			if (v >= offset && v <= end) {
				data.setUint32(i, v + amount, le);
			}
		}
	};
}

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
export function readCstr(
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

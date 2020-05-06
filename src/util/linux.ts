import {
	once,
	launcher
} from '../util';

/**
 * Find exact matches in data.
 *
 * @param data Data to search.
 * @param find Search for.
 * @param from Search from.
 */
function * findExact(
	data: Buffer,
	find: Buffer | string | Uint8Array,
	from = 0
) {
	let index = from - 1;
	for (;;) {
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
 */
function * findFuzzy(
	data: Buffer,
	find: (number | null)[],
	from = 0
) {
	const end = data.length - find.length;
	for (let i = from; i < end; i++) {
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
function writeFuzzy(data: Buffer, offset: number, fuzzy: (number | null)[]) {
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
 * @param offset OFfset of the string.
 * @param includeNull Optionally include null byte.
 * @param includeAlign Optionally include allignment bytes.
 * @returns Buffer slice.
 */
function readCstr(
	data: Buffer,
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
	return data.slice(offset, end);
}

/**
 * Converts a hex string into a series of byte values, with unknowns being null.
 *
 * @param str Hex string.
 * @returns Bytes and null values.
 */
function patchHexToBytes(str: string) {
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
function patchGroupOffsets(
	data: Buffer,
	patches: ({
		count: number;
		find: (number | null)[];
		replace: (number | null)[];
	})[]
) {
	const offsets = [];
	for (const {find, replace, count} of patches) {
		if (replace.length !== find.length) {
			throw new Error('Internal error');
		}
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
function patchOnce(data: Buffer, patches: ({
	count: number;
	find: (number | null)[];
	replace: (number | null)[];
})[][]) {
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
 * Attempt to replace Linux 32-bit menu title.
 *
 * @param data Projector data, maybe modified.
 * @param title Replacement title.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linuxPatchWindowTitle(data: Buffer, title: string) {
	// Encode the replacement string.
	const titleData = Buffer.from(title, 'utf8');

	// Titles should match one of these.
	const regAFP = /^Adobe Flash Player \d+(,\d+,\d+,\d+)?$/;
	const regMFP = /^Macromedia Flash Player \d+(,\d+,\d+,\d+)?$/;

	const targets: Buffer[] = [];
	const matched = (cstr: Buffer) => {
		if (!(titleData.length < cstr.length)) {
			throw new Error(
				`Replacement window title larger that ${cstr.length - 1}`
			);
		}
		targets.push(cstr);
	};

	for (const offset of findExact(data, '\0Adobe Flash Player ')) {
		const cstr = readCstr(data, offset + 1, true, false);
		const [str] = cstr.toString('ascii').split('\0', 1);
		if (regAFP.test(str)) {
			matched(cstr);
		}
	}

	if (!targets.length) {
		// Not sure why Flash Player 9 is like this, but this does find it.
		for (const offset of findExact(data, '\x08Adobe Flash Player ')) {
			const cstr = readCstr(data, offset + 1, true, false);
			const [str] = cstr.toString('ascii').split('\0', 1);
			if (regAFP.test(str)) {
				matched(cstr);
			}
		}
	}

	if (!targets.length) {
		for (const offset of findExact(data, '\0Macromedia Flash Player ')) {
			const cstr = readCstr(data, offset + 1, true, false);
			const [str] = cstr.toString('ascii').split('\0', 1);
			if (regMFP.test(str)) {
				matched(cstr);
			}
		}
	}

	// Write replacement strings into found slices.
	for (const target of targets) {
		target.fill(0);
		titleData.copy(target);
	}

	return data;
}

/**
 * Attempt to replace Linux 64-bit menu title.
 *
 * @param data Projector data, maybe modified.
 * @param title Replacement title.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linux64PatchWindowTitle(data: Buffer, title: string) {
	// Can just use the 32-bit patcher.
	return linuxPatchWindowTitle(data, title);
}

// A list of patch candidates, made to be partially position independant.
// So long as the ASM does not change, these can be applied to future versions.
// Essentially these NOP over the gtk_widget_show for gtk_menu_bar_new.
// Also NOP over the calls to gtk_menu_shell_insert when present.
/* eslint-disable no-multi-spaces, line-comment-position, no-inline-comments */
const linuxPatchMenuRemovePatches = once(() => [
	// 6.0.79.0
	[{
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'89 83 08 01 00 00',          // mov     DWORD PTR [ebx+0x108], eax
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_widget_show
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'89 83 08 01 00 00',          // mov     DWORD PTR [ebx+0x108], eax
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}],
	// 9.0.115.0
	[{
		count: 2,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'89 87 -- 02 00 00',          // mov     DWORD PTR [edi+...], eax
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_widget_show
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'89 87 -- 02 00 00',          // mov     DWORD PTR [edi+...], eax
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}, {
		count: 2,
		find: patchHexToBytes([
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --',             // call    ...
			'BA 03 00 00 00',             // mov     edx, 0x3
			'89 54 24 08',                // mov     DWORD PTR [esp+0x8], edx
			'89 -- 24 04',                // mov     DWORD PTR [esp+0x4], ...
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_menu_shell_insert
		].join(' ')),
		replace: patchHexToBytes([
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --',             // call    ...
			'BA 03 00 00 00',             // mov     edx, 0x3
			'89 54 24 08',                // mov     DWORD PTR [esp+0x8], edx
			'89 -- 24 04',                // mov     DWORD PTR [esp+0x4], ...
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}],
	// 10.0.12.36
	[{
		count: 2,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'89 86 -- 02 00 00',          // mov     DWORD PTR [esi+...], eax
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_widget_show
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'89 86 -- 02 00 00',          // mov     DWORD PTR [esi+...], eax
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}, {
		count: 1,
		find: patchHexToBytes([
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --',             // call    ...
			'C7 44 24 08 03 00 00 00',    // mov     DWORD PTR [esp+0x8], 0x3
			'89 74 24 04',                // mov     DWORD PTR [esp+0x4], esi
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_menu_shell_insert
		].join(' ')),
		replace: patchHexToBytes([
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --',             // call    ...
			'C7 44 24 08 03 00 00 00',    // mov     DWORD PTR [esp+0x8], 0x3
			'89 74 24 04',                // mov     DWORD PTR [esp+0x4], esi
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}, {
		count: 1,
		find: patchHexToBytes([
			'8B 45 0C',                   // mov     eax, DWORD PTR [ebp+0xC]
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --',             // call    ...
			'C7 44 24 08 03 00 00 00',    // mov     DWORD PTR [esp+0x8], 0x3
			'89 5C 24 04',                // mov     DWORD PTR [esp+0x4], ebx
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_menu_shell_insert
		].join(' ')),
		replace: patchHexToBytes([
			'8B 45 0C',                   // mov     eax, DWORD PTR [ebp+0xC]
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --',             // call    ...
			'C7 44 24 08 03 00 00 00',    // mov     DWORD PTR [esp+0x8], 0x3
			'89 5C 24 04',                // mov     DWORD PTR [esp+0x4], ebx
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}],
	// 10.1.53.64
	[{
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 DC',                   // mov     edx, DWORD PTR [ebp-0x24]
			'8B 42 60',                   // mov     eax, DWORD PTR [edx+0x60]
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_widget_show
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 DC',                   // mov     edx, DWORD PTR [ebp-0x24]
			'8B 42 60',                   // mov     eax, DWORD PTR [edx+0x60]
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}, {
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 10',                   // mov     edx, DWORD PTR [ebp+0x10]
			'8B 4D --',                   // mov     ecx, DWORD PTR [ebp-...]
			'89 54 24 08',                // mov     DWORD PTR [esp+0x8], edx
			'89 4C 24 04',                // mov     DWORD PTR [esp+0x4], ecx
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_menu_shell_insert
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 10',                   // mov     edx, DWORD PTR [ebp+0x10]
			'8B 4D --',                   // mov     ecx, DWORD PTR [ebp-...]
			'89 54 24 08',                // mov     DWORD PTR [esp+0x8], edx
			'89 4C 24 04',                // mov     DWORD PTR [esp+0x4], ecx
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}],
	// 11.0.1.152
	[{
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 D4',                   // mov     edx, DWORD PTR [ebp-0x2C]
			'8B 42 60',                   // mov     eax, DWORD PTR [edx+0x60]
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_widget_show
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 D4',                   // mov     edx, DWORD PTR [ebp-0x2C]
			'8B 42 60',                   // mov     eax, DWORD PTR [edx+0x60]
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}, {
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 14',                   // mov     edx, DWORD PTR [ebp+0x14]
			'89 74 24 04',                // mov     DWORD PTR [esp+0x4], esi
			'89 54 24 08',                // mov     DWORD PTR [esp+0x8], edx
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_menu_shell_insert
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 14',                   // mov     edx, DWORD PTR [ebp+0x14]
			'89 74 24 04',                // mov     DWORD PTR [esp+0x4], esi
			'89 54 24 08',                // mov     DWORD PTR [esp+0x8], edx
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}],
	// 11.2.202.228
	[{
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 08',                   // mov     edx, DWORD PTR [ebp+0x8]
			'8B 42 60',                   // mov     eax, DWORD PTR [edx+0x60]
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_widget_show
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 08',                   // mov     edx, DWORD PTR [ebp+0x8]
			'8B 42 60',                   // mov     eax, DWORD PTR [edx+0x60]
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}, {
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 14',                   // mov     edx, DWORD PTR [ebp+0x14]
			'89 7C 24 04',                // mov     DWORD PTR [esp+0x4], edi
			'89 54 24 08',                // mov     DWORD PTR [esp+0x8], edx
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'E8 -- -- -- --'              // call    _gtk_menu_shell_insert
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'8B 55 14',                   // mov     edx, DWORD PTR [ebp+0x14]
			'89 7C 24 04',                // mov     DWORD PTR [esp+0x4], edi
			'89 54 24 08',                // mov     DWORD PTR [esp+0x8], edx
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}]
]);

/**
 * Attempt to patch Linux 32-bit menu showing code.
 * NOP over the gtk_widget_show for gtk_menu_bar_new.
 * Also NOP over the calls to gtk_menu_shell_insert when present.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linuxPatchMenuRemoveData(data: Buffer) {
	patchOnce(data, linuxPatchMenuRemovePatches());
	return data;
}

// A list of patch candidates, made to be partially position independant.
// So long as the ASM does not change, these can be applied to future versions.
// Essentially these NOP over the gtk_widget_show for gtk_menu_bar_new.
// Also NOP over the calls to gtk_menu_shell_insert.
/* eslint-disable no-multi-spaces, line-comment-position, no-inline-comments */
const linux64PatchMenuRemovePatches = once(() => [
	// 24.0.0.186
	[{
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'49 8B BC 24 90 00 00 00',    // mov     rdi, QWORD PTR [r12+0x90]
			'E8 -- -- -- --'              // call    _gtk_widget_show
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'49 8B BC 24 90 00 00 00',    // mov     rdi, QWORD PTR [r12+0x90]
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}, {
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'44 89 EA',                   // mov     edx, r13d
			'48 89 DE',                   // mov     rsi, rbx
			'48 89 C7',                   // mov     rdi, rax
			'E8 -- -- -- --'              // call    _gtk_menu_shell_insert
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'44 89 EA',                   // mov     edx, r13d
			'48 89 DE',                   // mov     rsi, rbx
			'48 89 C7',                   // mov     rdi, rax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}],
	// 32.0.0.293
	[{
		count: 1,
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'49 8B BC 24 90 00 00 00',    // mov     rdi, QWORD PTR [r12+0x90]
			'E8 -- -- -- --'              // call    _gtk_widget_show
		].join(' ')),
		replace: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'49 8B BC 24 90 00 00 00',    // mov     rdi, QWORD PTR [r12+0x90]
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}, {
		count: 1,
		find: patchHexToBytes([
			'48 89 C7',                   // mov     rdi, rax
			'E8 -- -- -- --',             // call    ...
			'44 89 EA',                   // mov     edx, r13d
			'48 89 EE',                   // mov     rsi, rbp
			'48 89 C7',                   // mov     rdi, rax
			'E8 -- -- -- --'              // call    _gtk_menu_shell_insert
		].join(' ')),
		replace: patchHexToBytes([
			'48 89 C7',                   // mov     rdi, rax
			'E8 -- -- -- --',             // call    ...
			'44 89 EA',                   // mov     edx, r13d
			'48 89 EE',                   // mov     rsi, rbp
			'48 89 C7',                   // mov     rdi, rax
			'90 90 90 90 90'              // nop     x5
		].join(' '))
	}]
]);
/* eslint-enable no-multi-spaces, line-comment-position, no-inline-comments */

/**
 * Attempt to patch Linux 64-bit menu showing code.
 * NOP over the gtk_widget_show for gtk_menu_bar_new.
 * Also NOP over the calls to gtk_menu_shell_insert.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linux64PatchMenuRemoveData(data: Buffer) {
	patchOnce(data, linux64PatchMenuRemovePatches());
	return data;
}

// A list of patch candidates, made to be partially position independant.
// So long as the ASM does not change, these can be applied to future versions.
// Essentially these replace the bad ELF header reading logic with new logic.
// The code was never updated from the old 32-bit code and is not accurate.
/* eslint-disable no-multi-spaces, line-comment-position, no-inline-comments */
const linux64PatchProjectorOffsetPatches = once(() => [
	// 24.0.0.186
	[{
		count: 1,
		find: patchHexToBytes([
			'48 8D B4 24 80 00 00 00',    // lea     rsi, [rsp+0x80]
			'BA 34 00 00 00',             // mov     edx, 0x34
			'4C 89 FF',                   // mov     rdi, r15
			'4C 89 E1',                   // mov     rcx, r12
			'FF 50 28',                   // call    QWORD PTR [rax+0x28]
			'84 C0',                      // test    al, al
			'75 45',                      // jne     0x5D
			'49 8B 07',                   // mov     rax, QWORD PTR [r15]
			'4C 89 FF',                   // mov     rdi, r15
			'FF 50 08',                   // call    QWORD PTR [rax+0x8]
			'41 0F B6 5D 00',             // movzx   ebx, BYTE PTR [r13+0x0]
			'48 89 EF',                   // mov     rdi, rbp
			'E8 -- -- -- --',             // call    ...
			'48 8B 8C 24 B8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xB8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     ...
			'48 81 C4 C8 00 00 00',       // add     rsp, 0xC8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- --',                // ...
			'48 83 7C 24 30 34',          // cmp     QWORD PTR [rsp+0x30], 0x34
			'75 --',                      // jne     ...
			'8B B4 24 A0 00 00 00',       // mov     esi, DWORD PTR [rsp+0xA0]
			'BA 01 00 00 00',             // mov     edx, 0x1
			'4C 89 FF',                   // mov     rdi, r15
			'E8 -- -- -- --',             // call    ...
			'84 C0',                      // test    al, al
			'74 --',                      // je      ...
			'45 31 F6',                   // xor     r14d, r14d
			'66 83 BC 24 B0 00 00 00 00', // cmp     WORD PTR [rsp+0xB0], 0x0
			'C7 44 24 0C 00 00 00 00',    // mov     DWORD PTR [rsp+0xC], 0x0
			'74 --'                       // je      ...
		].join(' ')),
		replace: patchHexToBytes([
			// Change:
			'48 8D B4 24 78 00 00 00',    // lea     rsi, [rsp+0x78]
			// Change:
			'BA 40 00 00 00',             // mov     edx, 0x40
			'4C 89 FF',                   // mov     rdi, r15
			'4C 89 E1',                   // mov     rcx, r12
			'FF 50 28',                   // call    QWORD PTR [rax+0x28]
			'84 C0',                      // test    al, al
			'75 45',                      // jne     0x5B
			'49 8B 07',                   // mov     rax, QWORD PTR [r15]
			'4C 89 FF',                   // mov     rdi, r15
			'FF 50 08',                   // call    QWORD PTR [rax+0x8]
			'41 0F B6 5D 00',             // movzx   ebx, BYTE PTR [r13+0x0]
			'48 89 EF',                   // mov     rdi, rbp
			'E8 -- -- -- --',             // call    ...
			'48 8B 8C 24 B8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xB8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     ...
			'48 81 C4 C8 00 00 00',       // add     rsp, 0xC8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- --',                // ...
			// Change:
			'48 83 7C 24 30 40',          // cmp     QWORD PTR [rsp+0x30], 0x40
			'75 --',                      // jne     ...
			'8B B4 24 A0 00 00 00',       // mov     esi, DWORD PTR [rsp+0xA0]
			// Changes:
			'41 89 F6',                   // mov     r14d, esi
			'0F B7 84 24 B4 00 00 00',    // movzx   eax, WORD PTR [rsp+0xB4]
			'C1 E0 06',                   // shl     eax, 0x6
			'41 01 C6',                   // add     r14d, eax
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'EB --'                       // jmp     ...
		].join(' '))
	}],
	// 25.0.0.127
	[{
		count: 1,
		find: patchHexToBytes([
			'48 8D 74 24 70',             // lea     rsi, [rsp+0x70]
			'BA 34 00 00 00',             // mov     edx, 0x34
			'4C 89 FF',                   // mov     rdi, r15
			'4C 89 E1',                   // mov     rcx, r12
			'FF 50 28',                   // call    QWORD PTR [rax+0x28]
			'84 C0',                      // test    al, al
			'75 48',                      // jne     0x5F
			'49 8B 07',                   // mov     rax, QWORD PTR [r15]
			'4C 89 FF',                   // mov     rdi, r15
			'FF 50 08',                   // call    QWORD PTR [rax+0x8]
			'41 0F B6 5D 00',             // movzx   ebx, BYTE PTR [r13+0x0]
			'48 89 EF',                   // mov     rdi, rbp
			'E8 -- -- -- --',             // call    ...
			'48 8B 8C 24 A8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xA8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     ...
			'48 81 C4 B8 00 00 00',       // add     rsp, 0xB8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- -- -- -- --',       // ...
			'48 83 7C 24 30 34',          // cmp     QWORD PTR [rsp+0x30], 0x34
			'75 --',                      // jne     ...
			'8B B4 24 90 00 00 00',       // mov     esi, DWORD PTR [rsp+0x90]
			'BA 01 00 00 00',             // mov     edx, 0x1
			'4C 89 FF',                   // mov     rdi, r15
			'E8 -- -- -- --',             // call    ...
			'84 C0',                      // test    al, al
			'74 --',                      // je      ...
			'45 31 F6',                   // xor     r14d, r14d
			'66 83 BC 24 A0 00 00 00 00', // cmp     WORD PTR [rsp+0xA0], 0x0
			'C7 44 24 0C 00 00 00 00',    // mov     DWORD PTR [rsp+0xC], 0x0
			'74 --'                       // je      ...
		].join(' ')),
		replace: patchHexToBytes([
			// Change:
			'48 8D 74 24 68',             // lea     rsi, [rsp+0x68]
			// Change:
			'BA 40 00 00 00',             // mov     edx, 0x40
			'4C 89 FF',                   // mov     rdi, r15
			'4C 89 E1',                   // mov     rcx, r12
			'FF 50 28',                   // call    QWORD PTR [rax+0x28]
			'84 C0',                      // test    al, al
			'75 48',                      // jne     0x5F
			'49 8B 07',                   // mov     rax, QWORD PTR [r15]
			'4C 89 FF',                   // mov     rdi, r15
			'FF 50 08',                   // call    QWORD PTR [rax+0x8]
			'41 0F B6 5D 00',             // movzx   ebx, BYTE PTR [r13+0x0]
			'48 89 EF',                   // mov     rdi, rbp
			'E8 -- -- -- --',             // call    ...
			'48 8B 8C 24 A8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xA8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     ...
			'48 81 C4 B8 00 00 00',       // add     rsp, 0xB8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- -- -- -- --',       // ...
			// Change:
			'48 83 7C 24 30 40',          // cmp     QWORD PTR [rsp+0x30], 0x40
			'75 --',                      // jne     ...
			'8B B4 24 90 00 00 00',       // mov     esi, DWORD PTR [rsp+0x90]
			// Changes:
			'41 89 F6',                   // mov     r14d, esi
			'0F B7 84 24 A4 00 00 00',    // movzx   eax, WORD PTR [rsp+0xA4]
			'C1 E0 06',                   // shl     eax, 0x6
			'41 01 C6',                   // add     r14d, eax
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'EB --'                       // jmp     ...
		].join(' '))
	}],
	// 32.0.0.293
	[{
		count: 1,
		find: patchHexToBytes([
			'48 8D 74 24 70',             // lea     rsi, [rsp+0x70]
			'BA 34 00 00 00',             // mov     edx, 0x34
			'48 89 DF',                   // mov     rdi, rbx
			'4C 89 E9',                   // mov     rcx, r13
			'FF 50 28',                   // call    QWORD PTR [rax+0x28]
			'84 C0',                      // test    al, al
			'75 4E',                      // jne     0x50
			'48 8B 03',                   // mov     rax, QWORD PTR [rbx]
			'48 89 DF',                   // mov     rdi, rbx
			'FF 50 08',                   // call    QWORD PTR [rax+0x8]
			'48 8B 44 24 08',             // mov     rax, QWORD PTR [rsp+0x8]
			'4C 89 E7',                   // mov     rdi, r12
			'0F B6 18',                   // movzx   ebx, BYTE PTR [rax]
			'E8 -- -- -- --',             // call    ...
			'48 8B 8C 24 A8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xA8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     ...
			'48 81 C4 B8 00 00 00',       // add     rsp, 0xB8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- -- -- -- -- -- -- --', // ...
			'48 83 7C 24 30 34',          // cmp     QWORD PTR [rsp+0x30], 0x34
			'75 --',                      // jne     ...
			'8B B4 24 90 00 00 00',       // mov     esi, DWORD PTR [rsp+0x90]
			'BA 01 00 00 00',             // mov     edx, 0x1
			'48 89 DF',                   // mov     rdi, rbx
			'E8 -- -- -- --',             // call    ...
			'84 C0',                      // test    al, al
			'74 92',
			'66 83 BC 24 A0 00 00 00 00', // cmp     WORD PTR [rsp+0xA0], 0x0
			'0F 84 -- -- -- --',          // je      ...
			'45 31 F6',                   // xor     r14d, r14d
			'45 31 FF',                   // xor     r15d, r15d
			'0F 1F 00',                   // nop     DWORD PTR [rax]
			'48 8B 03',                   // mov     rax, QWORD PTR [rbx]
			'4C 89 E9',                   // mov     rcx, r13
			'BA 28 00 00 00',             // mov     edx, 0x28
			'48 89 EE',                   // mov     rsi, rbp
			'48 89 DF',                   // mov     rdi, rbx
			'FF 50 28',                   // call    QWORD PTR [rax+0x28]
			'84 C0',                      // test    al, al
			'0F 85 -- -- -- --'           // jne     ...
		].join(' ')),
		replace: patchHexToBytes([
			// Change:
			'48 8D 74 24 68',             // lea     rsi, [rsp+0x68]
			// Change:
			'BA 40 00 00 00',             // mov     edx, 0x40
			'48 89 DF',                   // mov     rdi, rbx
			'4C 89 E9',                   // mov     rcx, r13
			'FF 50 28',                   // call    QWORD PTR [rax+0x28]
			'84 C0',                      // test    al, al
			'75 4E',                      // jne     0x50
			'48 8B 03',                   // mov     rax, QWORD PTR [rbx]
			'48 89 DF',                   // mov     rdi, rbx
			'FF 50 08',                   // call    QWORD PTR [rax+0x8]
			'48 8B 44 24 08',             // mov     rax, QWORD PTR [rsp+0x8]
			'4C 89 E7',                   // mov     rdi, r12
			'0F B6 18',                   // movzx   ebx, BYTE PTR [rax]
			'E8 -- -- -- --',             // call    ...
			'48 8B 8C 24 A8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xA8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     ...
			'48 81 C4 B8 00 00 00',       // add     rsp, 0xB8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- -- -- -- -- -- -- --', // ...
			// Change:
			'48 83 7C 24 30 40',          // cmp     QWORD PTR [rsp+0x30], 0x40
			'75 --',                      // jne     ...
			'8B B4 24 90 00 00 00',       // mov     esi, DWORD PTR [rsp+0x90]
			// Changes:
			'41 89 F7',                   // mov     r15d, esi
			'0F B7 84 24 A4 00 00 00',    // movzx   eax, WORD PTR [rsp+0xA4]
			'C1 E0 06',                   // shl     eax, 0x6
			'41 01 C7',                   // add     r15d, eax
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90',                // nop     x4
			'90 90 90 90'                 // nop     x4
		].join(' '))
	}]
]);
/* eslint-enable no-multi-spaces, line-comment-position, no-inline-comments */

/**
 * Attempt to patch Linux 64-bit projector offset code.
 * Replaces old 32-bit ELF header reading logic with 64-bit logic.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linux64PatchProjectorOffsetData(data: Buffer) {
	patchOnce(data, linux64PatchProjectorOffsetPatches());
	return data;
}

/**
 * Common absolute string reference replace code.
 *
 * @param at Where in the match the offset integer is.
 * @returns Function that preforms patchin testing and optionally applying.
 */
function linuxPatchProjectorPathPatcherAbs(at: number) {
	return (
		data: Buffer,
		off: number,
		src: number[],
		dst: number,
		mod: boolean
	) => {
		const valueAt = off + at;
		const base = data.readInt32LE(0x7C);
		const rel = data.readInt32LE(valueAt);
		const abs = rel - base;
		if (!src.includes(abs)) {
			return false;
		}
		if (!mod) {
			return true;
		}
		const diff = dst - abs;
		const relFixed = rel + diff;
		data.writeInt32LE(relFixed, valueAt);
		return true;
	};
}

/**
 * Common relative string reference replace code.
 *
 * @param atBase Where in the match the base is calculated.
 * @param atValue Where in the match the offset integer is.
 * @returns Function that preforms patchin testing and optionally applying.
 */
function linuxPatchProjectorPathPatcherRel(atBase: number, atValue: number) {
	return (
		data: Buffer,
		off: number,
		src: number[],
		dst: number,
		mod: boolean
	) => {
		const valueAt = off + atValue;
		const ebx = off + atBase + 5 + data.readInt32LE(off + 7);
		const rel = data.readInt32LE(valueAt);
		const abs = ebx + rel;
		if (!src.includes(abs)) {
			return false;
		}
		if (!mod) {
			return true;
		}
		const diff = dst - abs;
		const relFixed = rel + diff;
		data.writeInt32LE(relFixed, valueAt);
		return true;
	};
}

/* eslint-disable no-multi-spaces, line-comment-position, no-inline-comments */
const linuxPatchProjectorPathPatches = once(() => [
	// 9.0.115.0
	{
		find: patchHexToBytes([
			'0F 84 -- -- -- --',          // je      ...
			'8D 5D E8',                   // lea     ebx, [ebp-0x18]
			'BE -- -- -- --',             // mov     esi, ...
			'89 74 24 04',                // mov     DWORD PTR [esp+0x4], esi
			'89 1C 24',                   // mov     DWORD PTR [esp], ebx
			'E8 -- -- -- --'              // call    ...
		].join(' ')),
		patch: linuxPatchProjectorPathPatcherAbs(10)
	},
	// 10.0.12.36
	{
		find: patchHexToBytes([
			'0F 84 -- -- -- --',          // je      ...
			'8D 9D E0 EF FF FF',          // lea     ebx, [ebp-0x1020]
			'C7 44 24 04 -- -- -- --',    // mov     DWORD PTR [esp+0x4], ...
			'89 1C 24',                   // mov     DWORD PTR [esp], ebx
			'E8 -- -- -- --'              // call    ...
		].join(' ')),
		patch: linuxPatchProjectorPathPatcherAbs(16)
	},
	// 10.1.53.64
	{
		find: patchHexToBytes([
			'0F 84 -- -- -- --',          // je      ...
			'8D 45 E4',                   // lea     eax, [ebp-0x1C]
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'C7 44 24 04 -- -- -- --',    // mov     DWORD PTR [esp+0x4], ...
			'E8 -- -- -- --',             // call    ...
			'8B 55 08'                    // mov     edx, DWORD PTR [ebp+0x8]
		].join(' ')),
		patch: linuxPatchProjectorPathPatcherAbs(16)
	},
	// 11.0.1.152
	{
		find: patchHexToBytes([
			'0F 84 -- -- -- --',          // je      ...
			'8D 45 E4',                   // lea     eax, [ebp-0x1C]
			'31 DB',                      // xor     ebx, ebx
			'89 04 24',                   // mov     DWORD PTR [esp], eax
			'C7 44 24 04 -- -- -- --',    // mov     DWORD PTR [esp+0x4], ...
			'E8 -- -- -- --'              // call    ...
		].join(' ')),
		patch: linuxPatchProjectorPathPatcherAbs(18)
	},
	// 11.2.202.228
	{
		find: patchHexToBytes([
			'E8 -- -- -- --',             // call    ...
			'81 C3 -- -- -- --',          // add     ebx, 0x0
			'85 --',                      // test    ..., ...
			'0F 84 -- -- -- --',          // je      ...
			'8D 83 -- -- -- --',          // lea     eax, [ebx+0x0]
			'31 F6',                      // xor     esi, esi
			'89 44 24 04'                 // mov     DWORD PTR [esp+0x4], eax
		].join(' ')),
		patch: linuxPatchProjectorPathPatcherRel(0, 21)
	}
]);
/* eslint-enable no-multi-spaces, line-comment-position, no-inline-comments */

/**
 * Attempt to patch Linux 32-bit projector path code.
 * Replaces bad "file:" prefix with "file://" for projector self URL.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linuxPatchProjectorPathData(data: Buffer) {
	// Find candidates for the string to replace the reference to.
	const fileNoSlashes = [...findExact(data, '\0file:\0')].map(i => i + 1);
	if (!fileNoSlashes.length) {
		throw new Error('No projector path patch "file:" strings');
	}

	// Find the replacement string.
	const fileSlashes = data.indexOf('\0file://\0') + 1;
	if (!fileSlashes) {
		throw new Error('No projector path patch "file://" strings');
	}

	// Search the buffer for patch candidates, testing patches for relevance.
	let patchFound = null;
	let patchOffset = -1;
	for (const patch of linuxPatchProjectorPathPatches()) {
		for (const offset of findFuzzy(data, patch.find)) {
			// Test patch without applying.
			if (!patch.patch(data, offset, fileNoSlashes, fileSlashes, false)) {
				continue;
			}
			if (patchFound) {
				throw new Error(
					'Multiple projector path patch candidates found'
				);
			}
			patchFound = patch;
			patchOffset = offset;
		}
	}
	if (!patchFound) {
		throw new Error('No projector path patch candidates found');
	}

	// Apply patch, this should not fail.
	if (!(
		patchFound.patch(data, patchOffset, fileNoSlashes, fileSlashes, true)
	)) {
		throw new Error('Internal error');
	}

	return data;
}

// A list of patch candidates, made to be partially position independant.
// So long as the ASM does not change, these can be applied to future versions.
// Essentially search for the reference to "file:" that we need to replace.
// Checking the offset in the bytes actually points there is also necessary.
/* eslint-disable no-multi-spaces, line-comment-position, no-inline-comments */
const linux64PatchProjectorPathPatches = once(() => [
	{
		find: patchHexToBytes([
			'49 89 F4',                   // mov     r12, rsi
			'48 8D 35 -- -- -- --'        // lea     rsi, [rip + -- -- -- --]
		].join(' ')),
		offset: 6
	}
]);
/* eslint-enable no-multi-spaces, line-comment-position, no-inline-comments */

/**
 * Attempt to patch Linux 64-bit projector path code.
 * Replaces bad "file:" prefix with "file://" for projector self URL.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linux64PatchProjectorPathData(data: Buffer) {
	// Find candidates for the string to replace the reference to.
	const fileNoSlashes = [...findExact(data, '\0file:\0')].map(i => i + 1);
	if (!fileNoSlashes.length) {
		throw new Error('No projector path patch "file:" strings');
	}

	// Find the replacement string.
	const fileSlashes = data.indexOf('\0file://\0') + 1;
	if (!fileSlashes) {
		throw new Error('No projector path patch "file://" strings');
	}

	// Search the buffer for patch candidates, check if they point at string.
	let patchFound = null;
	let patchOffset = -1;
	for (const patch of linux64PatchProjectorPathPatches()) {
		for (const offset of findFuzzy(data, patch.find)) {
			const offsetRel = offset + patch.offset;
			const relative = data.readInt32LE(offsetRel);
			const offsetAfter = offsetRel + 4;
			const offsetTarget = offsetAfter + relative;
			if (fileNoSlashes.includes(offsetTarget)) {
				if (patchFound) {
					throw new Error(
						'Multiple projector path patch candidates found'
					);
				}
				patchFound = patch;
				patchOffset = offset;
			}
		}
	}
	if (!patchFound) {
		throw new Error('No projector path patch candidates found');
	}

	// Write the replacement offset.
	const offsetRel = patchOffset + patchFound.offset;
	const offsetAfter = offsetRel + 4;
	const relative = fileSlashes - offsetAfter;
	data.writeInt32LE(relative, offsetRel);
	return data;
}

/**
 * Get Linux launcher for the specified type.
 *
 * @param type Executable type.
 * @param resources File to optionally copy resources from.
 * @returns Launcher data.
 */
export async function linuxLauncher(
	type: 'i386' | 'x86_64',
	resources: string | null = null
) {
	switch (type) {
		case 'i386': {
			return launcher('linux-i386');
		}
		case 'x86_64': {
			return launcher('linux-x86_64');
		}
		default: {
			throw new Error(`Invalid type: ${type}`);
		}
	}
}

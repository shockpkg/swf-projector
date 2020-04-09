import fse from 'fs-extra';

import {once} from '../util';

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

// A list of patch candidates, made to be partially position independant.
// So long as the ASM does not change, these can be applited to future versions.
// Essentially these replace the bad ELF header reading logic with new logic.
// The code was never updated from the old 32-bit code and is not accurate.
/* eslint-disable no-multi-spaces, line-comment-position, no-inline-comments */
const linux64PatchProjectorOffsetPatches = once(() => [
	// 24.0.0.186
	{
		find: patchHexToBytes([
			'48 8D B4 24 80 00 00 00',    // lea     rsi, [rsp+0x80]
			'BA 34 00 00 00',             // mov     edx, 0x34
			'4C 89 FF',                   // mov     rdi, r15
			'4C 89 E1',                   // mov     rcx, r12
			'FF 50 28',                   // call    QWORD PTR [rax+0x28]
			'84 C0',                      // test    al, al
			'75 45',                      // jne     0x5b
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
			'75 45',                      // jne     0x5b
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
	},
	// 25.0.0.127
	{
		find: patchHexToBytes([
			'48 8D 74 24 70',             // lea     rsi, [rsp+0x70]
			'BA 34 00 00 00',             // mov     edx, 0x34
			'4C 89 FF',                   // mov     rdi, r15
			'4C 89 E1',                   // mov     rcx, r12
			'FF 50 28',                   // call    QWORD PTR [rax+0x28]
			'84 C0',                      // test    al, al
			'75 48',                      // jne     0x5f
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
			'75 48',                      // jne     0x5f
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
	},
	// 32.0.0.293
	{
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
			'66 83 BC 24 A0 00 00 00 00', // cmp     WORD PTR [rsp+0xa0], 0x0
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
			'0F B7 84 24 A4 00 00 00',    // movzx   eax, WORD PTR [rsp+0xa4]
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
	}
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
	// Search the buffer for patch candidates.
	let foundOffset = -1;
	let foundPatch: (number | null)[] = [];
	for (const patch of linux64PatchProjectorOffsetPatches()) {
		const {find, replace} = patch;
		if (replace.length !== find.length) {
			throw new Error('Internal error');
		}

		// findFuzzy(data, find);
		for (const i of findFuzzy(data, find)) {
			if (foundOffset !== -1) {
				throw new Error(
					'Multiple projector offset patch candidates found'
				);
			}

			// Remember patch to apply.
			foundOffset = i;
			foundPatch = replace;
		}
	}
	if (foundOffset === -1) {
		throw new Error('No projector offset patch candidates found');
	}

	// Apply the patch to the buffer, and write to file.
	for (let i = 0; i < foundPatch.length; i++) {
		const b = foundPatch[i];
		if (b !== null) {
			data[foundOffset + i] = b;
		}
	}
	return data;
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
			'8D 45 E4',                   // lea     eax, [ebp-0x1c]
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
			'8D 45 E4',                   // lea     eax, [ebp-0x1c]
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
// So long as the ASM does not change, these can be applited to future versions.
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
 * Attempt to patch Linux 64-bit projector offset code.
 *
 * @param file Projector file.
 * @deprecated No longer used in this package.
 */
export async function linux64PatchProjectorOffset(file: string) {
	// Read projector into buffer.
	const data = await fse.readFile(file);
	await fse.writeFile(file, linux64PatchProjectorOffsetData(data));
}

import fse from 'fs-extra';

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

/* eslint-disable no-multi-spaces */
/* eslint-disable line-comment-position */
/* eslint-disable no-inline-comments */
// A list of patch candidates, made to be partially position independant.
// So long as the ASM does not change, these can be applited to future versions.
// Essentially these replace the bad ELF header reading logic with new logic.
// The code was never updated from the old 32-bit code and is not accurate.
const linux64PatchProjectorOffsetPatches = [
	// 24.0.0.186 - 24.0.0.221:
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
			'E8 -- -- -- --',             // call    -- -- -- --
			'48 8B 8C 24 B8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xB8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     -- -- -- --
			'48 81 C4 C8 00 00 00',       // add     rsp, 0xC8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- --',                // -- -- -- --
			'48 83 7C 24 30 34',          // cmp     QWORD PTR [rsp+0x30], 0x34
			'75 --',                      // jne     --
			'8B B4 24 A0 00 00 00',       // mov     esi, DWORD PTR [rsp+0xA0]
			'BA 01 00 00 00',             // mov     edx, 0x1
			'4C 89 FF',                   // mov     rdi, r15
			'E8 -- -- -- --',             // call    -- -- -- --
			'84 C0',                      // test    al, al
			'74 --',                      // je      --
			'45 31 F6',                   // xor     r14d, r14d
			'66 83 BC 24 B0 00 00 00 00', // cmp     WORD PTR [rsp+0xB0], 0x0
			'C7 44 24 0C 00 00 00 00',    // mov     DWORD PTR [rsp+0xC], 0x0
			'74 --'                       // je      --
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
			'E8 -- -- -- --',             // call    -- -- -- --
			'48 8B 8C 24 B8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xB8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     -- -- -- --
			'48 81 C4 C8 00 00 00',       // add     rsp, 0xC8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- --',                // -- -- -- --
			// Change:
			'48 83 7C 24 30 40',          // cmp     QWORD PTR [rsp+0x30], 0x40
			'75 --',                      // jne     --
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
			'EB --'                       // jmp     --
		].join(' '))
	},
	// 25.0.0.127 - 32.0.0.270:
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
			'E8 -- -- -- --',             // call    -- -- -- --
			'48 8B 8C 24 A8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xA8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     -- -- -- --
			'48 81 C4 B8 00 00 00',       // add     rsp, 0xB8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- -- -- -- --',       // -- -- -- -- -- -- --
			'48 83 7C 24 30 34',          // cmp     QWORD PTR [rsp+0x30], 0x34
			'75 --',                      // jne     --
			'8B B4 24 90 00 00 00',       // mov     esi, DWORD PTR [rsp+0x90]
			'BA 01 00 00 00',             // mov     edx, 0x1
			'4C 89 FF',                   // mov     rdi, r15
			'E8 -- -- -- --',             // call    -- -- -- --
			'84 C0',                      // test    al, al
			'74 --',                      // je      --
			'45 31 F6',                   // xor     r14d, r14d
			'66 83 BC 24 A0 00 00 00 00', // cmp     WORD PTR [rsp+0xA0], 0x0
			'C7 44 24 0C 00 00 00 00',    // mov     DWORD PTR [rsp+0xC], 0x0
			'74 --'                       // je      --
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
			'E8 -- -- -- --',             // call    -- -- -- --
			'48 8B 8C 24 A8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xA8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     -- -- -- --
			'48 81 C4 B8 00 00 00',       // add     rsp, 0xB8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- -- -- -- --',       // -- -- -- -- -- -- --
			// Change:
			'48 83 7C 24 30 40',          // cmp     QWORD PTR [rsp+0x30], 0x40
			'75 --',                      // jne     --
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
			'EB --'                       // jmp     --
		].join(' '))
	},
	// 32.0.0.293 - lastest:
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
			'E8 -- -- -- --',             // call    -- -- -- --
			'48 8B 8C 24 A8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xA8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     -- -- -- --
			'48 81 C4 B8 00 00 00',       // add     rsp, 0xB8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- -- -- -- -- -- -- --', // -- -- -- -- -- -- -- -- -- --
			'48 83 7C 24 30 34',          // cmp     QWORD PTR [rsp+0x30], 0x34
			'75 --',                      // jne     --
			'8B B4 24 90 00 00 00',       // mov     esi, DWORD PTR [rsp+0x90]
			'BA 01 00 00 00',             // mov     edx, 0x1
			'48 89 DF',                   // mov     rdi, rbx
			'E8 -- -- -- --',             // call    -- -- -- --
			'84 C0',                      // test    al, al
			'74 92',
			'66 83 BC 24 A0 00 00 00 00', // cmp     WORD PTR [rsp+0xa0], 0x0
			'0F 84 -- -- -- --',          // je      -- -- -- --
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
			'0F 85 -- -- -- --'           // jne     -- -- -- --
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
			'E8 -- -- -- --',             // call    -- -- -- --
			'48 8B 8C 24 A8 00 00 00',    // mov     rcx, QWORD PTR [rsp+0xA8]
			'64 48 33 0C 25 28 00 00 00', // xor     rcx, QWORD PTR fs:0x28
			'89 D8',                      // mov     eax, ebx
			'0F 85 -- -- -- --',          // jne     -- -- -- --
			'48 81 C4 B8 00 00 00',       // add     rsp, 0xB8
			'5B',                         // pop     rbx
			'5D',                         // pop     rbp
			'41 5C',                      // pop     r12
			'41 5D',                      // pop     r13
			'41 5E',                      // pop     r14
			'41 5F',                      // pop     r15
			'C3',                         // ret
			'-- -- -- -- -- -- -- -- -- --', // -- -- -- -- -- -- -- -- -- --
			// Change:
			'48 83 7C 24 30 40',          // cmp     QWORD PTR [rsp+0x30], 0x40
			'75 --',                      // jne     --
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
];
/* eslint-enable no-multi-spaces */
/* eslint-enable line-comment-position */
/* eslint-enable no-inline-comments */

/**
 * Attempt to patch Linux 64-bit projector offset code.
 *
 * @param file Projector file.
 */
export async function linux64PatchProjectorOffset(file: string) {
	// Read projector into buffer.
	const data = await fse.readFile(file);

	// Search the buffer for patch candidates.
	let foundOffset = -1;
	let foundPatch: (number | null)[] = [];
	for (const patch of linux64PatchProjectorOffsetPatches) {
		const {find, replace} = patch;
		if (replace.length !== find.length) {
			throw new Error('Internal error');
		}

		const end = data.length - find.length;
		for (let i = 0; i < end; i++) {
			let found = true;
			for (let j = 0; j < find.length; j++) {
				const b = find[j];
				if (b !== null && data[i + j] !== b) {
					found = false;
					break;
				}
			}
			if (!found) {
				continue;
			}
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
	await fse.writeFile(file, data);
}

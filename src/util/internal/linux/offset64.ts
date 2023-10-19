/* eslint-disable max-classes-per-file */

import {patchHexToBytes, writeFuzzy} from '../patch';

import {Elf64} from './elf';
import {Patch} from './patch';

/**
 * Patch offset 64-bit spec.
 */
export interface IPatchOffset64Spec {
	/**
	 * Fuzzy find.
	 */
	find: string;

	/**
	 * Fuzzy replace.
	 */
	replace: string;
}

/**
 * PatchOffset64 object.
 * Replace the bad ELF header reading logic with new logic.
 * The code was never updated from the old 32-bit code and is not accurate.
 */
export abstract class PatchOffset64 extends Patch<Elf64> {
	/**
	 * Patch spec.
	 */
	protected abstract _spec: IPatchOffset64Spec;

	private _replace_ = [] as [Uint8Array, number, string][];

	/**
	 * @inheritDoc
	 */
	public check() {
		this._replace_ = [];
		const {find, replace} = this._spec;
		const rep = [] as [Uint8Array, number, string][];
		for (const [, i, d] of this._findFuzzyCode(find)) {
			if (rep.length) {
				return false;
			}
			rep.push([d, i, replace]);
		}
		if (rep.length !== 1) {
			return false;
		}
		this._replace_ = rep;
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public patch() {
		for (const [d, i, h] of this._replace_) {
			writeFuzzy(d, i, patchHexToBytes(h));
		}
	}
}

/**
 * Patch objects.
 */
export const offset64 = [
	/**
	 * 24.0.0.186 x86_64.
	 */
	class extends PatchOffset64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = {
			find: [
				// lea     rsi, [rsp+0x80]
				'48 8D B4 24 80 00 00 00',
				// mov     edx, 0x34
				'BA 34 00 00 00',
				// mov     rdi, r15
				'4C 89 FF',
				// mov     rcx, r12
				'4C 89 E1',
				// call    QWORD PTR [rax+0x28]
				'FF 50 28',
				// test    al, al
				'84 C0',
				// jne     0x5D
				'75 45',
				// mov     rax, QWORD PTR [r15]
				'49 8B 07',
				// mov     rdi, r15
				'4C 89 FF',
				// call    QWORD PTR [rax+0x8]
				'FF 50 08',
				// movzx   ebx, BYTE PTR [r13+0x0]
				'41 0F B6 5D 00',
				// mov     rdi, rbp
				'48 89 EF',
				// call    ...
				'E8 -- -- -- --',
				// mov     rcx, QWORD PTR [rsp+0xB8]
				'48 8B 8C 24 B8 00 00 00',
				// xor     rcx, QWORD PTR fs:0x28
				'64 48 33 0C 25 28 00 00 00',
				// mov     eax, ebx
				'89 D8',
				// jne     ...
				'0F 85 -- -- -- --',
				// add     rsp, 0xC8
				'48 81 C4 C8 00 00 00',
				// pop     rbx
				'5B',
				// pop     rbp
				'5D',
				// pop     r12
				'41 5C',
				// pop     r13
				'41 5D',
				// pop     r14
				'41 5E',
				// pop     r15
				'41 5F',
				// ret
				'C3',
				// ...
				'-- -- -- --',
				// cmp     QWORD PTR [rsp+0x30], 0x34
				'48 83 7C 24 30 34',
				// jne     ...
				'75 --',
				// mov     esi, DWORD PTR [rsp+0xA0]
				'8B B4 24 A0 00 00 00',
				// mov     edx, 0x1
				'BA 01 00 00 00',
				// mov     rdi, r15
				'4C 89 FF',
				// call    ...
				'E8 -- -- -- --',
				// test    al, al
				'84 C0',
				// je      ...
				'74 --',
				// xor     r14d, r14d
				'45 31 F6',
				// cmp     WORD PTR [rsp+0xB0], 0x0
				'66 83 BC 24 B0 00 00 00 00',
				// mov     DWORD PTR [rsp+0xC], 0x0
				'C7 44 24 0C 00 00 00 00',
				// je      ...
				'74 --'
			].join(' '),
			replace: [
				// Change:
				// lea     rsi, [rsp+0x78]
				'48 8D B4 24 78 00 00 00',
				// Change:
				// mov     edx, 0x40
				'BA 40 00 00 00',
				// mov     rdi, r15
				'4C 89 FF',
				// mov     rcx, r12
				'4C 89 E1',
				// call    QWORD PTR [rax+0x28]
				'FF 50 28',
				// test    al, al
				'84 C0',
				// jne     0x5B
				'75 45',
				// mov     rax, QWORD PTR [r15]
				'49 8B 07',
				// mov     rdi, r15
				'4C 89 FF',
				// call    QWORD PTR [rax+0x8]
				'FF 50 08',
				// movzx   ebx, BYTE PTR [r13+0x0]
				'41 0F B6 5D 00',
				// mov     rdi, rbp
				'48 89 EF',
				// call    ...
				'E8 -- -- -- --',
				// mov     rcx, QWORD PTR [rsp+0xB8]
				'48 8B 8C 24 B8 00 00 00',
				// xor     rcx, QWORD PTR fs:0x28
				'64 48 33 0C 25 28 00 00 00',
				// mov     eax, ebx
				'89 D8',
				// jne     ...
				'0F 85 -- -- -- --',
				// add     rsp, 0xC8
				'48 81 C4 C8 00 00 00',
				// pop     rbx
				'5B',
				// pop     rbp
				'5D',
				// pop     r12
				'41 5C',
				// pop     r13
				'41 5D',
				// pop     r14
				'41 5E',
				// pop     r15
				'41 5F',
				// ret
				'C3',
				// ...
				'-- -- -- --',
				// Change:
				// cmp     QWORD PTR [rsp+0x30], 0x40
				'48 83 7C 24 30 40',
				// jne     ...
				'75 --',
				// mov     esi, DWORD PTR [rsp+0xA0]
				'8B B4 24 A0 00 00 00',
				// Changes:
				// mov     r14d, esi
				'41 89 F6',
				// movzx   eax, WORD PTR [rsp+0xB4]
				'0F B7 84 24 B4 00 00 00',
				// shl     eax, 0x6
				'C1 E0 06',
				// add     r14d, eax
				'41 01 C6',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// jmp     ...
				'EB --'
			].join(' ')
		};
	},

	/**
	 * 25.0.0.127 x86_64.
	 */
	class extends PatchOffset64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = {
			find: [
				// lea     rsi, [rsp+0x70]
				'48 8D 74 24 70',
				// mov     edx, 0x34
				'BA 34 00 00 00',
				// mov     rdi, r15
				'4C 89 FF',
				// mov     rcx, r12
				'4C 89 E1',
				// call    QWORD PTR [rax+0x28]
				'FF 50 28',
				// test    al, al
				'84 C0',
				// jne     0x5F
				'75 48',
				// mov     rax, QWORD PTR [r15]
				'49 8B 07',
				// mov     rdi, r15
				'4C 89 FF',
				// call    QWORD PTR [rax+0x8]
				'FF 50 08',
				// movzx   ebx, BYTE PTR [r13+0x0]
				'41 0F B6 5D 00',
				// mov     rdi, rbp
				'48 89 EF',
				// call    ...
				'E8 -- -- -- --',
				// mov     rcx, QWORD PTR [rsp+0xA8]
				'48 8B 8C 24 A8 00 00 00',
				// xor     rcx, QWORD PTR fs:0x28
				'64 48 33 0C 25 28 00 00 00',
				// mov     eax, ebx
				'89 D8',
				// jne     ...
				'0F 85 -- -- -- --',
				// add     rsp, 0xB8
				'48 81 C4 B8 00 00 00',
				// pop     rbx
				'5B',
				// pop     rbp
				'5D',
				// pop     r12
				'41 5C',
				// pop     r13
				'41 5D',
				// pop     r14
				'41 5E',
				// pop     r15
				'41 5F',
				// ret
				'C3',
				// ...
				'-- -- -- -- -- -- --',
				// cmp     QWORD PTR [rsp+0x30], 0x34
				'48 83 7C 24 30 34',
				// jne     ...
				'75 --',
				// mov     esi, DWORD PTR [rsp+0x90]
				'8B B4 24 90 00 00 00',
				// mov     edx, 0x1
				'BA 01 00 00 00',
				// mov     rdi, r15
				'4C 89 FF',
				// call    ...
				'E8 -- -- -- --',
				// test    al, al
				'84 C0',
				// je      ...
				'74 --',
				// xor     r14d, r14d
				'45 31 F6',
				// cmp     WORD PTR [rsp+0xA0], 0x0
				'66 83 BC 24 A0 00 00 00 00',
				// mov     DWORD PTR [rsp+0xC], 0x0
				'C7 44 24 0C 00 00 00 00',
				// je      ...
				'74 --'
			].join(' '),
			replace: [
				// Change:
				// lea     rsi, [rsp+0x68]
				'48 8D 74 24 68',
				// Change:
				// mov     edx, 0x40
				'BA 40 00 00 00',
				// mov     rdi, r15
				'4C 89 FF',
				// mov     rcx, r12
				'4C 89 E1',
				// call    QWORD PTR [rax+0x28]
				'FF 50 28',
				// test    al, al
				'84 C0',
				// jne     0x5F
				'75 48',
				// mov     rax, QWORD PTR [r15]
				'49 8B 07',
				// mov     rdi, r15
				'4C 89 FF',
				// call    QWORD PTR [rax+0x8]
				'FF 50 08',
				// movzx   ebx, BYTE PTR [r13+0x0]
				'41 0F B6 5D 00',
				// mov     rdi, rbp
				'48 89 EF',
				// call    ...
				'E8 -- -- -- --',
				// mov     rcx, QWORD PTR [rsp+0xA8]
				'48 8B 8C 24 A8 00 00 00',
				// xor     rcx, QWORD PTR fs:0x28
				'64 48 33 0C 25 28 00 00 00',
				// mov     eax, ebx
				'89 D8',
				// jne     ...
				'0F 85 -- -- -- --',
				// add     rsp, 0xB8
				'48 81 C4 B8 00 00 00',
				// pop     rbx
				'5B',
				// pop     rbp
				'5D',
				// pop     r12
				'41 5C',
				// pop     r13
				'41 5D',
				// pop     r14
				'41 5E',
				// pop     r15
				'41 5F',
				// ret
				'C3',
				// ...
				'-- -- -- -- -- -- --',
				// Change:
				// cmp     QWORD PTR [rsp+0x30], 0x40
				'48 83 7C 24 30 40',
				// jne     ...
				'75 --',
				// mov     esi, DWORD PTR [rsp+0x90]
				'8B B4 24 90 00 00 00',
				// Changes:
				// mov     r14d, esi
				'41 89 F6',
				// movzx   eax, WORD PTR [rsp+0xA4]
				'0F B7 84 24 A4 00 00 00',
				// shl     eax, 0x6
				'C1 E0 06',
				// add     r14d, eax
				'41 01 C6',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// jmp     ...
				'EB --'
			].join(' ')
		};
	},

	/**
	 * 32.0.0.293 x86_64.
	 */
	class extends PatchOffset64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = {
			find: [
				// lea     rsi, [rsp+0x70]
				'48 8D 74 24 70',
				// mov     edx, 0x34
				'BA 34 00 00 00',
				// mov     rdi, rbx
				'48 89 DF',
				// mov     rcx, r13
				'4C 89 E9',
				// call    QWORD PTR [rax+0x28]
				'FF 50 28',
				// test    al, al
				'84 C0',
				// jne     0x50
				'75 4E',
				// mov     rax, QWORD PTR [rbx]
				'48 8B 03',
				// mov     rdi, rbx
				'48 89 DF',
				// call    QWORD PTR [rax+0x8]
				'FF 50 08',
				// mov     rax, QWORD PTR [rsp+0x8]
				'48 8B 44 24 08',
				// mov     rdi, r12
				'4C 89 E7',
				// movzx   ebx, BYTE PTR [rax]
				'0F B6 18',
				// call    ...
				'E8 -- -- -- --',
				// mov     rcx, QWORD PTR [rsp+0xA8]
				'48 8B 8C 24 A8 00 00 00',
				// xor     rcx, QWORD PTR fs:0x28
				'64 48 33 0C 25 28 00 00 00',
				// mov     eax, ebx
				'89 D8',
				// jne     ...
				'0F 85 -- -- -- --',
				// add     rsp, 0xB8
				'48 81 C4 B8 00 00 00',
				// pop     rbx
				'5B',
				// pop     rbp
				'5D',
				// pop     r12
				'41 5C',
				// pop     r13
				'41 5D',
				// pop     r14
				'41 5E',
				// pop     r15
				'41 5F',
				// ret
				'C3',
				// ...
				'-- -- -- -- -- -- -- -- -- --',
				// cmp     QWORD PTR [rsp+0x30], 0x34
				'48 83 7C 24 30 34',
				// jne     ...
				'75 --',
				// mov     esi, DWORD PTR [rsp+0x90]
				'8B B4 24 90 00 00 00',
				// mov     edx, 0x1
				'BA 01 00 00 00',
				// mov     rdi, rbx
				'48 89 DF',
				// call    ...
				'E8 -- -- -- --',
				// test    al, al
				'84 C0',
				'74 92',
				// cmp     WORD PTR [rsp+0xA0], 0x0
				'66 83 BC 24 A0 00 00 00 00',
				// je      ...
				'0F 84 -- -- -- --',
				// xor     r14d, r14d
				'45 31 F6',
				// xor     r15d, r15d
				'45 31 FF',
				// nop     DWORD PTR [rax]
				'0F 1F 00',
				// mov     rax, QWORD PTR [rbx]
				'48 8B 03',
				// mov     rcx, r13
				'4C 89 E9',
				// mov     edx, 0x28
				'BA 28 00 00 00',
				// mov     rsi, rbp
				'48 89 EE',
				// mov     rdi, rbx
				'48 89 DF',
				// call    QWORD PTR [rax+0x28]
				'FF 50 28',
				// test    al, al
				'84 C0',
				// jne     ...
				'0F 85 -- -- -- --'
			].join(' '),
			replace: [
				// Change:
				// lea     rsi, [rsp+0x68]
				'48 8D 74 24 68',
				// Change:
				// mov     edx, 0x40
				'BA 40 00 00 00',
				// mov     rdi, rbx
				'48 89 DF',
				// mov     rcx, r13
				'4C 89 E9',
				// call    QWORD PTR [rax+0x28]
				'FF 50 28',
				// test    al, al
				'84 C0',
				// jne     0x50
				'75 4E',
				// mov     rax, QWORD PTR [rbx]
				'48 8B 03',
				// mov     rdi, rbx
				'48 89 DF',
				// call    QWORD PTR [rax+0x8]
				'FF 50 08',
				// mov     rax, QWORD PTR [rsp+0x8]
				'48 8B 44 24 08',
				// mov     rdi, r12
				'4C 89 E7',
				// movzx   ebx, BYTE PTR [rax]
				'0F B6 18',
				// call    ...
				'E8 -- -- -- --',
				// mov     rcx, QWORD PTR [rsp+0xA8]
				'48 8B 8C 24 A8 00 00 00',
				// xor     rcx, QWORD PTR fs:0x28
				'64 48 33 0C 25 28 00 00 00',
				// mov     eax, ebx
				'89 D8',
				// jne     ...
				'0F 85 -- -- -- --',
				// add     rsp, 0xB8
				'48 81 C4 B8 00 00 00',
				// pop     rbx
				'5B',
				// pop     rbp
				'5D',
				// pop     r12
				'41 5C',
				// pop     r13
				'41 5D',
				// pop     r14
				'41 5E',
				// pop     r15
				'41 5F',
				// ret
				'C3',
				// ...
				'-- -- -- -- -- -- -- -- -- --',
				// Change:
				// cmp     QWORD PTR [rsp+0x30], 0x40
				'48 83 7C 24 30 40',
				// jne     ...
				'75 --',
				// mov     esi, DWORD PTR [rsp+0x90]
				'8B B4 24 90 00 00 00',
				// Changes:
				// mov     r15d, esi
				'41 89 F7',
				// movzx   eax, WORD PTR [rsp+0xA4]
				'0F B7 84 24 A4 00 00 00',
				// shl     eax, 0x6
				'C1 E0 06',
				// add     r15d, eax
				'41 01 C7',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90',
				// nop     x4
				'90 90 90 90'
			].join(' ')
		};
	}
] as (new (elf: Elf64) => PatchOffset64)[];

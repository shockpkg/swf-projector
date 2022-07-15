import {once, launcher} from '../util';

import {
	findExact,
	findFuzzy,
	readCstr,
	patchHexToBytes,
	patchOnce
} from './internal/patch';

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

	/**
	 * Matched.
	 *
	 * @param cstr C-String.
	 */
	const matched = (cstr: Buffer) => {
		if (!(titleData.length < cstr.length)) {
			throw new Error(
				`Replacement window title larger than ${cstr.length - 1}`
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
const linuxPatchMenuRemovePatches = once(() => [
	// 6.0.79.0
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [ebx+0x108], eax
					'89 83 08 01 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [ebx+0x108], eax
					'89 83 08 01 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		}
	],
	// 9.0.115.0
	[
		{
			count: 2,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [edi+...], eax
					'89 87 -- 02 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [edi+...], eax
					'89 87 -- 02 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		},
		{
			count: 2,
			find: patchHexToBytes(
				[
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, 0x3
					'BA 03 00 00 00',
					// mov     DWORD PTR [esp+0x8], edx
					'89 54 24 08',
					// mov     DWORD PTR [esp+0x4], ...
					'89 -- 24 04',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_menu_shell_insert
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, 0x3
					'BA 03 00 00 00',
					// mov     DWORD PTR [esp+0x8], edx
					'89 54 24 08',
					// mov     DWORD PTR [esp+0x4], ...
					'89 -- 24 04',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		}
	],
	// 10.0.12.36
	[
		{
			count: 2,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [esi+...], eax
					'89 86 -- 02 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [esi+...], eax
					'89 86 -- 02 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		},
		{
			count: 1,
			find: patchHexToBytes(
				[
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [esp+0x8], 0x3
					'C7 44 24 08 03 00 00 00',
					// mov     DWORD PTR [esp+0x4], esi
					'89 74 24 04',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_menu_shell_insert
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [esp+0x8], 0x3
					'C7 44 24 08 03 00 00 00',
					// mov     DWORD PTR [esp+0x4], esi
					'89 74 24 04',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		},
		{
			count: 1,
			find: patchHexToBytes(
				[
					// mov     eax, DWORD PTR [ebp+0xC]
					'8B 45 0C',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [esp+0x8], 0x3
					'C7 44 24 08 03 00 00 00',
					// mov     DWORD PTR [esp+0x4], ebx
					'89 5C 24 04',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_menu_shell_insert
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// mov     eax, DWORD PTR [ebp+0xC]
					'8B 45 0C',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [esp+0x8], 0x3
					'C7 44 24 08 03 00 00 00',
					// mov     DWORD PTR [esp+0x4], ebx
					'89 5C 24 04',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		}
	],
	// 10.1.53.64
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp-0x24]
					'8B 55 DC',
					// mov     eax, DWORD PTR [edx+0x60]
					'8B 42 60',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp-0x24]
					'8B 55 DC',
					// mov     eax, DWORD PTR [edx+0x60]
					'8B 42 60',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		},
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp+0x10]
					'8B 55 10',
					// mov     ecx, DWORD PTR [ebp-...]
					'8B 4D --',
					// mov     DWORD PTR [esp+0x8], edx
					'89 54 24 08',
					// mov     DWORD PTR [esp+0x4], ecx
					'89 4C 24 04',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_menu_shell_insert
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp+0x10]
					'8B 55 10',
					// mov     ecx, DWORD PTR [ebp-...]
					'8B 4D --',
					// mov     DWORD PTR [esp+0x8], edx
					'89 54 24 08',
					// mov     DWORD PTR [esp+0x4], ecx
					'89 4C 24 04',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		}
	],
	// 11.0.1.152
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp-0x2C]
					'8B 55 D4',
					// mov     eax, DWORD PTR [edx+0x60]
					'8B 42 60',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp-0x2C]
					'8B 55 D4',
					// mov     eax, DWORD PTR [edx+0x60]
					'8B 42 60',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		},
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp+0x14]
					'8B 55 14',
					// mov     DWORD PTR [esp+0x4], esi
					'89 74 24 04',
					// mov     DWORD PTR [esp+0x8], edx
					'89 54 24 08',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_menu_shell_insert
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp+0x14]
					'8B 55 14',
					// mov     DWORD PTR [esp+0x4], esi
					'89 74 24 04',
					// mov     DWORD PTR [esp+0x8], edx
					'89 54 24 08',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		}
	],
	// 11.2.202.228
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp+0x8]
					'8B 55 08',
					// mov     eax, DWORD PTR [edx+0x60]
					'8B 42 60',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp+0x8]
					'8B 55 08',
					// mov     eax, DWORD PTR [edx+0x60]
					'8B 42 60',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		},
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp+0x14]
					'8B 55 14',
					// mov     DWORD PTR [esp+0x4], edi
					'89 7C 24 04',
					// mov     DWORD PTR [esp+0x8], edx
					'89 54 24 08',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_menu_shell_insert
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, DWORD PTR [ebp+0x14]
					'8B 55 14',
					// mov     DWORD PTR [esp+0x4], edi
					'89 7C 24 04',
					// mov     DWORD PTR [esp+0x8], edx
					'89 54 24 08',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		}
	]
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
const linux64PatchMenuRemovePatches = once(() => [
	// 24.0.0.186
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     rdi, QWORD PTR [r12+0x90]
					'49 8B BC 24 90 00 00 00',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     rdi, QWORD PTR [r12+0x90]
					'49 8B BC 24 90 00 00 00',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		},
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, r13d
					'44 89 EA',
					// mov     rsi, rbx
					'48 89 DE',
					// mov     rdi, rax
					'48 89 C7',
					// call    _gtk_menu_shell_insert
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, r13d
					'44 89 EA',
					// mov     rsi, rbx
					'48 89 DE',
					// mov     rdi, rax
					'48 89 C7',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		}
	],
	// 32.0.0.293
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     rdi, QWORD PTR [r12+0x90]
					'49 8B BC 24 90 00 00 00',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// call    ...
					'E8 -- -- -- --',
					// mov     rdi, QWORD PTR [r12+0x90]
					'49 8B BC 24 90 00 00 00',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		},
		{
			count: 1,
			find: patchHexToBytes(
				[
					// mov     rdi, rax
					'48 89 C7',
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, r13d
					'44 89 EA',
					// mov     rsi, rbp
					'48 89 EE',
					// mov     rdi, rax
					'48 89 C7',
					// call    _gtk_menu_shell_insert
					'E8 -- -- -- --'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// mov     rdi, rax
					'48 89 C7',
					// call    ...
					'E8 -- -- -- --',
					// mov     edx, r13d
					'44 89 EA',
					// mov     rsi, rbp
					'48 89 EE',
					// mov     rdi, rax
					'48 89 C7',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			)
		}
	]
]);

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
const linux64PatchProjectorOffsetPatches = once(() => [
	// 24.0.0.186
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
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
				].join(' ')
			),
			replace: patchHexToBytes(
				[
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
			)
		}
	],
	// 25.0.0.127
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
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
				].join(' ')
			),
			replace: patchHexToBytes(
				[
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
			)
		}
	],
	// 32.0.0.293
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
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
				].join(' ')
			),
			replace: patchHexToBytes(
				[
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
			)
		}
	]
]);

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
		const base = data.readInt32LE(0x7c);
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

const linuxPatchProjectorPathPatches = once(() => [
	// 9.0.115.0
	{
		find: patchHexToBytes(
			[
				// je      ...
				'0F 84 -- -- -- --',
				// lea     ebx, [ebp-0x18]
				'8D 5D E8',
				// mov     esi, ...
				'BE -- -- -- --',
				// mov     DWORD PTR [esp+0x4], esi
				'89 74 24 04',
				// mov     DWORD PTR [esp], ebx
				'89 1C 24',
				// call    ...
				'E8 -- -- -- --'
			].join(' ')
		),
		patch: linuxPatchProjectorPathPatcherAbs(10)
	},
	// 10.0.12.36
	{
		find: patchHexToBytes(
			[
				// je      ...
				'0F 84 -- -- -- --',
				// lea     ebx, [ebp-0x1020]
				'8D 9D E0 EF FF FF',
				// mov     DWORD PTR [esp+0x4], ...
				'C7 44 24 04 -- -- -- --',
				// mov     DWORD PTR [esp], ebx
				'89 1C 24',
				// call    ...
				'E8 -- -- -- --'
			].join(' ')
		),
		patch: linuxPatchProjectorPathPatcherAbs(16)
	},
	// 10.1.53.64
	{
		find: patchHexToBytes(
			[
				// je      ...
				'0F 84 -- -- -- --',
				// lea     eax, [ebp-0x1C]
				'8D 45 E4',
				// mov     DWORD PTR [esp], eax
				'89 04 24',
				// mov     DWORD PTR [esp+0x4], ...
				'C7 44 24 04 -- -- -- --',
				// call    ...
				'E8 -- -- -- --',
				// mov     edx, DWORD PTR [ebp+0x8]
				'8B 55 08'
			].join(' ')
		),
		patch: linuxPatchProjectorPathPatcherAbs(16)
	},
	// 11.0.1.152
	{
		find: patchHexToBytes(
			[
				// je      ...
				'0F 84 -- -- -- --',
				// lea     eax, [ebp-0x1C]
				'8D 45 E4',
				// xor     ebx, ebx
				'31 DB',
				// mov     DWORD PTR [esp], eax
				'89 04 24',
				// mov     DWORD PTR [esp+0x4], ...
				'C7 44 24 04 -- -- -- --',
				// call    ...
				'E8 -- -- -- --'
			].join(' ')
		),
		patch: linuxPatchProjectorPathPatcherAbs(18)
	},
	// 11.2.202.228
	{
		find: patchHexToBytes(
			[
				// call    ...
				'E8 -- -- -- --',
				// add     ebx, 0x0
				'81 C3 -- -- -- --',
				// test    ..., ...
				'85 --',
				// je      ...
				'0F 84 -- -- -- --',
				// lea     eax, [ebx+0x0]
				'8D 83 -- -- -- --',
				// xor     esi, esi
				'31 F6',
				// mov     DWORD PTR [esp+0x4], eax
				'89 44 24 04'
			].join(' ')
		),
		patch: linuxPatchProjectorPathPatcherRel(0, 21)
	}
]);

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
	if (
		!patchFound.patch(data, patchOffset, fileNoSlashes, fileSlashes, true)
	) {
		throw new Error('Internal error');
	}

	return data;
}

// A list of patch candidates, made to be partially position independant.
// So long as the ASM does not change, these can be applied to future versions.
// Essentially search for the reference to "file:" that we need to replace.
// Checking the offset in the bytes actually points there is also necessary.
const linux64PatchProjectorPathPatches = once(() => [
	{
		find: patchHexToBytes(
			[
				// mov     r12, rsi
				'49 89 F4',
				// lea     rsi, [rip + -- -- -- --]
				'48 8D 35 -- -- -- --'
			].join(' ')
		),
		offset: 6
	}
]);

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
 * @returns Launcher data.
 */
export async function linuxLauncher(type: 'i386' | 'x86_64') {
	switch (type) {
		case 'i386': {
			return launcher('linux-i386');
		}
		case 'x86_64': {
			return launcher('linux-x86_64');
		}
		default: {
			throw new Error(`Invalid type: ${type as string}`);
		}
	}
}

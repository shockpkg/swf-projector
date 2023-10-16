import {once, patchHexToBytes} from '../patch';

export const ood64 = once(() => [
	// 26.0.0.137, 32.0.0.270
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// mov     QWORD PTR [rsp+0x8], rbx
					'48 89 5C 24 08',
					// push    rdi
					'57',
					// sub     rsp, 0x20
					'48 83 EC 20',
					// mov     rbx, rcx
					'48 8B D9',
					// mov     rdi, rdx
					'48 8B FA',
					// add     rcx, 0x8
					'48 83 C1 08',
					// call    ...
					'E8 -- -- -- --',
					// mov     r8d, DWORD PTR [rbx]
					'44 8B 03',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0xAB
					'0F 84 85 00 00 00',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x9E
					'74 72',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x91
					'74 5F',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x84
					'74 4C',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x77
					'74 39',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x6A
					'74 26',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x5D
					'74 13',
					// cmp     r8d, 0x1
					'41 83 F8 01',
					// jne     0xB6
					'75 66',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 59',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 4C',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 3F',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 32',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 25',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 18',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB6
					'EB 0B',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// mov     rbx, QWORD PTR [rsp+0x30]
					'48 8B 5C 24 30',
					// add     rsp, 0x20
					'48 83 C4 20',
					// pop     rdi
					'5F',
					// ret
					'C3'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// ret
					'C3'
				].join(' ')
			)
		}
	],
	// 30.0.0.134
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// mov     QWORD PTR [rsp+0x8], rbx
					'48 89 5C 24 08',
					// push    rdi
					'57',
					// sub     rsp, 0x20
					'48 83 EC 20',
					// mov     rbx, rcx
					'48 8B D9',
					// mov     rdi, rdx
					'48 8B FA',
					// add     rcx, 0x8
					'48 83 C1 08',
					// call    ...
					'E8 -- -- -- --',
					// mov     r8d, DWORD PTR [rbx]
					'44 8B 03',
					// cmp     r8d, 0x5
					'41 83 F8 05',
					// jg      0x81
					'7F 64',
					// je      0x74
					'74 55',
					// test    r8d, r8d
					'45 85 C0',
					// je      0xB8
					'0F 84 90 00 00 00',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x67
					'74 39',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x5A
					'74 26',
					// sub     r8d, 0x1
					'41 83 E8 01',
					// je      0x4D
					'74 13',
					// cmp     r8d, 0x1
					'41 83 F8 01',
					// jne     0xB8
					'75 78',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xB3
					'EB 6B',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xAE
					'EB 5E',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xA9
					'EB 51',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0xA4
					'EB 44',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x9F
					'EB 37',
					// cmp     r8d, 0x6
					'41 83 F8 06',
					// je      0x94
					'74 26',
					// cmp     r8d, 0x7
					'41 83 F8 07',
					// je      0x87
					'74 13',
					// cmp     r8d, 0x8
					'41 83 F8 08',
					// jne     0x9F
					'75 25',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x9A
					'EB 18',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x95
					'EB 0B',
					// mov     rdx, rdi
					'48 8B D7',
					// mov     rcx, rbx
					'48 8B CB',
					// call    ...
					'E8 -- -- -- --',
					// mov     rbx, QWORD PTR [rsp+0x30]
					'48 8B 5C 24 30',
					// add     rsp, 0x20
					'48 83 C4 20',
					// pop     rdi
					'5F',
					// ret
					'C3'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// ret
					'C3'
				].join(' ')
			)
		}
	]
]);

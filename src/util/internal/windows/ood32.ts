import {once, patchHexToBytes} from '../patch';

export const ood32 = once(() => [
	// 30.0.0.113
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// push    ebp
					'55',
					// mov     ebp, esp
					'8B EC',
					// push    esi
					'56',
					// mov     esi, ecx
					'8B F1',
					// push    edi
					'57',
					// mov     edi, DWORD PTR [ebp+0x8]
					'8B 7D 08',
					// push    edi
					'57',
					// lea     ecx, [esi+0x4]
					'8D 4E 04',
					// call    ...
					'E8 -- -- -- --',
					// mov     eax, DWORD PTR [esi]
					'8B 06',
					// cmp     eax, 0xE
					'83 F8 0E',
					// ja      0x6F
					'77 55',
					// jmp     DWORD PTR [eax*4+...]
					'FF 24 85 -- -- -- --',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 44',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 3A',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 30',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 26',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 1C',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 12',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x6F
					'EB 08',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// pop     edi
					'5F',
					// pop     esi
					'5E',
					// pop     ebp
					'5D',
					// ret     0x4
					'C2 04 00'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// ret     0x4
					'C2 04 00'
				].join(' ')
			)
		}
	],
	// 31.0.0.108
	[
		{
			count: 1,
			find: patchHexToBytes(
				[
					// push    ebp
					'55',
					// mov     ebp, esp
					'8B EC',
					// push    esi
					'56',
					// mov     esi, ecx
					'8B F1',
					// push    edi
					'57',
					// mov     edi, DWORD PTR [ebp+0x8]
					'8B 7D 08',
					// push    edi
					'57',
					// lea     ecx, [esi+0x4]
					'8D 4E 04',
					// call    ...
					'E8 -- -- -- --',
					// mov     eax, DWORD PTR [esi]
					'8B 06',
					// dec     eax
					'48',
					// cmp     eax, 0x7
					'83 F8 07',
					// ja      0x70
					'77 55',
					// jmp     DWORD PTR [eax*4+...]
					'FF 24 85 -- -- -- --',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 44',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 3A',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 30',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 26',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 1C',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 12',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// jmp     0x70
					'EB 08',
					// push    edi
					'57',
					// mov     ecx, esi
					'8B CE',
					// call    ...
					'E8 -- -- -- --',
					// pop     edi
					'5F',
					// pop     esi
					'5E',
					// pop     ebp
					'5D',
					// ret     0x4
					'C2 04 00'
				].join(' ')
			),
			replace: patchHexToBytes(
				[
					// ret     0x4
					'C2 04 00'
				].join(' ')
			)
		}
	]
]);

/* eslint-disable max-classes-per-file */

import {Elf32} from './elf';
import {PatchMenu} from './menu';

/**
 * PatchMenu32 object.
 */
export abstract class PatchMenu32 extends PatchMenu<Elf32> {}

/**
 * Patch objects.
 */
export const menu32 = [
	/**
	 * 6.0.79.0 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: [
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [ebx+0x108], eax
					'89 83 08 01 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' '),
				replace: [
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [ebx+0x108], eax
					'89 83 08 01 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			}
		];
	},

	/**
	 * 9.0.115.0 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 2,
				find: [
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [edi+...], eax
					'89 87 -- 02 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' '),
				replace: [
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [edi+...], eax
					'89 87 -- 02 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			},
			{
				count: 2,
				find: [
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
				].join(' '),
				replace: [
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
			}
		];
	},

	/**
	 * 10.0.12.36 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 2,
				find: [
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [esi+...], eax
					'89 86 -- 02 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' '),
				replace: [
					// call    ...
					'E8 -- -- -- --',
					// mov     DWORD PTR [esi+...], eax
					'89 86 -- 02 00 00',
					// mov     DWORD PTR [esp], eax
					'89 04 24',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			},
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			},
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			}
		];
	},

	/**
	 * 10.1.53.64 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			},
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			}
		];
	},

	/**
	 * 11.0.1.152 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			},
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			}
		];
	},

	/**
	 * 11.2.202.228 i386.
	 */
	class extends PatchMenu32 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			},
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			}
		];
	}
] as (new (elf: Elf32) => PatchMenu32)[];

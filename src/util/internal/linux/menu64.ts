/* eslint-disable max-classes-per-file */

import {Elf64} from './elf';
import {PatchMenu} from './menu';

/**
 * PatchMenu64 object.
 */
export abstract class PatchMenu64 extends PatchMenu<Elf64> {}

/**
 * Patch objects.
 */
export const menu64 = [
	/**
	 * 24.0.0.186 x86_64.
	 */
	class extends PatchMenu64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: [
					// call    ...
					'E8 -- -- -- --',
					// mov     rdi, QWORD PTR [r12+0x90]
					'49 8B BC 24 90 00 00 00',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' '),
				replace: [
					// call    ...
					'E8 -- -- -- --',
					// mov     rdi, QWORD PTR [r12+0x90]
					'49 8B BC 24 90 00 00 00',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			},
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			}
		];
	},

	/**
	 * 32.0.0.293 x86_64.
	 */
	class extends PatchMenu64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = [
			{
				count: 1,
				find: [
					// call    ...
					'E8 -- -- -- --',
					// mov     rdi, QWORD PTR [r12+0x90]
					'49 8B BC 24 90 00 00 00',
					// call    _gtk_widget_show
					'E8 -- -- -- --'
				].join(' '),
				replace: [
					// call    ...
					'E8 -- -- -- --',
					// mov     rdi, QWORD PTR [r12+0x90]
					'49 8B BC 24 90 00 00 00',
					// nop     x5
					'90 90 90 90 90'
				].join(' ')
			},
			{
				count: 1,
				find: [
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
				].join(' '),
				replace: [
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
			}
		];
	}
] as (new (elf: Elf64) => PatchMenu64)[];

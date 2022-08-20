import {once} from '../../../util';
import {patchHexToBytes} from '../patch';

// Essentially these NOP over the gtk_widget_show for gtk_menu_bar_new.
// Also NOP over the calls to gtk_menu_shell_insert.
export const menuRemovePatches64 = once(() => [
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

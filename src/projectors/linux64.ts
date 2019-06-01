import {
	readFile as fseReadFile,
	writeFile as fseWriteFile
} from 'fs-extra';
import {
	join as pathJoin
} from 'path';

import {
	defaultFalse
} from '../util';

import {
	IProjectorLinuxOptions,
	ProjectorLinux
} from './linux';

/**
 * Converts a hex string into a series of byte values, with unknowns being null.
 *
 * @param str Hex string
 * @return Bytes and null values.
 */
function patchHexToBytes(str: string) {
	return (str.replace(/[\s\r\n]/g, '').match(/.{1,2}/g) || []).map(s => {
		if (s.length !== 2) {
			throw new Error('Internal error');
		}
		return /[0-9A-F]{2}/i.test(s) ? parseInt(s, 16) : null;
	});
}

// A list of patch candidates, made to be partially position independant.
// So long as the ASM does not change, these can be applited to future versions.
// Essentially these replace the bad ELF header reading logic with new logic.
// The code was never updated from the old 32-bit code and is not accurate.
const patches = [
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
	// 25.0.0.127 - latest:
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
	}
];

// tslint:disable-next-line no-empty-interface
export interface IProjectorLinux64Options extends IProjectorLinuxOptions {
	/**
	 * Attempt to patch the projector offset reading code.
	 * Necessary to work around broken projector logic in standalone players.
	 * Set to true to automaticly patch the code if possible.
	 *
	 * @defaultValue false
	 */
	patchProjectorOffset?: boolean;
}

/**
 * ProjectorLinux64 constructor.
 *
 * @param options Options object.
 */
export class ProjectorLinux64 extends ProjectorLinux {
	/**
	 * Attempt to patch the projector offset reading code.
	 * Necessary to work around broken projector logic in standalone players.
	 * Set to true to automaticly patch the code if possible.
	 *
	 * @defaultValue false
	 */
	public patchProjectorOffset: boolean;

	constructor(options: IProjectorLinux64Options = {}) {
		super(options);

		this.patchProjectorOffset = defaultFalse(options.patchProjectorOffset);
	}

	/**
	 * The movie appended marker.
	 */
	public get movieAppendMarker() {
		return '563412FAFFFFFFFF';
	}

	/**
	 * Modify the projector player.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _modifyPlayer(path: string, name: string) {
		// tslint:disable-next-line no-this-assignment
		const {patchProjectorOffset} = this;

		// Skip if no patching was requested.
		if (!patchProjectorOffset) {
			return;
		}

		const projectorPath = pathJoin(path, name);

		// Read projector into buffer.
		const data = await fseReadFile(projectorPath);

		// Search the buffer for patch candidates.
		let foundOffset = -1;
		let foundPatch: (number | null)[] = [];
		for (const patch of patches) {
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
					throw new Error('Multiple patch candidates found');
				}

				// Remember patch to apply.
				foundOffset = i;
				foundPatch = replace;
			}
		}
		if (foundOffset === -1) {
			throw new Error('No patch candidates found');
		}

		// Apply the patch to the buffer, and write to file.
		for (let i = 0; i < foundPatch.length; i++) {
			const b = foundPatch[i];
			if (b !== null) {
				data[foundOffset + i] = b;
			}
		}
		await fseWriteFile(projectorPath, data);
	}

	/**
	 * Write out the projector movie file.
	 *
	 * @param path Save path.
	 * @param name Save name.
	 */
	protected async _writeMovie(path: string, name: string) {
		const data = await this.getMovieData();
		if (!data) {
			return;
		}

		await this._appendMovieData(pathJoin(path, name), data, 'lmd');
	}
}

/* eslint-disable max-classes-per-file */

import {once} from '../../../util';
import {findFuzzyOnce, patchHexToBytes} from '../patch';

import {CPU_TYPE_I386, CPU_TYPE_X86_64} from './constants';

/**
 * MacProjectTitlePatch object.
 */
export abstract class MacProjectTitlePatch {
	public static readonly CPU_TYPE: number;

	protected _data: Buffer;

	protected _vmaddr: number;

	protected _title: number;

	/**
	 * MacProjectTitlePatch constructor.
	 *
	 * @param data Code data.
	 * @param vmaddr Code address.
	 * @param title Title address.
	 */
	constructor(data: Buffer, vmaddr: number, title: number) {
		this._data = data;
		this._vmaddr = vmaddr;
		this._title = title;
	}

	/**
	 * Check patch.
	 *
	 * @returns True if valid patch, else false.
	 */
	public abstract check(): boolean;

	/**
	 * Apply patch.
	 */
	public abstract patch(): void;
}

/**
 * MacProjectTitlePatchI386 object.
 */
export abstract class MacProjectTitlePatchI386 extends MacProjectTitlePatch {
	public static readonly CPU_TYPE = CPU_TYPE_I386;
}

/**
 * MacProjectTitlePatchX8664 object.
 */
export abstract class MacProjectTitlePatchX8664 extends MacProjectTitlePatch {
	public static readonly CPU_TYPE = CPU_TYPE_X86_64;
}

export const macProjectTitlePatches: {
	CPU_TYPE: number;
	new (data: Buffer, vmaddr: number, title: number): MacProjectTitlePatch;
}[] = [
	/**
	 * 11.0.1.152 i386.
	 */
	class extends MacProjectTitlePatchI386 {
		private _offset_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			const found = findFuzzyOnce(
				this._data,
				patchHexToBytes(
					[
						// push    ebp
						'55',
						// mov     ebp, esp
						'89 E5',
						// push    esi
						'56',
						// push    ebx
						'53',
						// sub     esp, 0x10
						'83 EC 10',
						// mov     esi, DWORD PTR [ebp+0x8]
						'8B 75 08',
						// mov     eax, DWORD PTR [ebp+0xc]
						'8B 45 0C',
						// mov     ebx, DWORD PTR [eax]
						'8B 18',
						// mov     ecx, DWORD PTR [eax+0x4]
						'8B 48 04',
						// test    ecx, ecx
						'85 C9',
						// cmove   ecx, DWORD PTR ds:...
						'0F 44 0D -- -- -- --',
						// mov     DWORD PTR [esp+0x8], ebx
						'89 5C 24 08',
						// mov     DWORD PTR [esp+0x4], ecx
						'89 4C 24 04',
						// mov     edx, DWORD PTR ds:...
						'8B 15 -- -- -- --',
						// mov     eax, DWORD PTR [edx]
						'8B 02',
						// mov     DWORD PTR [esp], eax
						'89 04 24',
						// call    -- -- -- --
						'E8 -- -- -- --'
					].join(' ')
				)
			);
			if (found === null) {
				return false;
			}

			this._offset_ = found;
			return true;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const d = this._data;
			let i = this._offset_ + 11;

			// lea ecx, ...
			d.writeUInt8(0x8d, i++);
			d.writeUInt8(0x0d, i++);
			d.writeInt32LE(this._title, i);
			i += 4;

			// mov ebx, DWORD PTR [ecx]
			d.writeUInt8(0x8b, i++);
			d.writeUInt8(0x19, i++);

			// add ecx, 0x4
			d.writeUInt8(0x83, i++);
			d.writeUInt8(0xc1, i++);
			d.writeUInt8(0x04, i++);

			// nop 6
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
		}
	},

	/**
	 * 11.0.1.152 x86_64.
	 */
	class extends MacProjectTitlePatchX8664 {
		private _offset_ = 0;

		private _offsetJump_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			const found = findFuzzyOnce(
				this._data,
				patchHexToBytes(
					[
						// push    rbp
						'55',
						// mov     rbp, rsp
						'48 89 E5',
						// push    r12
						'41 54',
						// push    rbx
						'53',
						// mov     r12, rdi
						'49 89 FC',
						// mov     rdx, QWORD PTR [rsi]
						'48 8B 16',
						// mov     rsi, QWORD PTR [rsi+0x8]
						'48 8B 76 08',
						// test    rsi, rsi
						'48 85 F6',
						// je      --
						'74 --',
						// mov     rax, QWORD PTR [rip+...]
						'48 8B 05 -- -- -- --',
						// mov     rdi, QWORD PTR [rax]
						'48 8B 38',
						// call    -- -- -- --
						'E8 -- -- -- --'
					].join(' ')
				)
			);
			if (found === null) {
				return false;
			}

			// Sanity check the jump target instructions.
			const offsetJump = found + 22 + this._data.readInt8(found + 21);
			if (
				findFuzzyOnce(
					this._data.subarray(offsetJump, offsetJump + 7),
					patchHexToBytes(
						// lea     rsi, [rip+...]
						'48 8D 35 -- -- -- --'
					)
				) !== 0
			) {
				return false;
			}

			this._offset_ = found;
			this._offsetJump_ = offsetJump;
			return true;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const d = this._data;
			let i = this._offset_ + 10;

			// lea rsi, [rip+...]
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x8d, i++);
			d.writeUInt8(0x35, i++);
			d.writeInt32LE(this._title - (this._vmaddr + i + 4), i);
			i += 4;

			// movsxd rdx, DWORD PTR [rsi]
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x63, i++);
			d.writeUInt8(0x16, i++);

			// jmp --
			d.writeUInt8(0xeb, i++);

			i = this._offsetJump_;

			// add rsi, 0x4
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x83, i++);
			d.writeUInt8(0xc6, i++);
			d.writeUInt8(0x04, i++);

			// nop 3
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
		}
	},

	/**
	 * 13.0.0.182 i386.
	 */
	class extends MacProjectTitlePatchI386 {
		private _offset_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			const found = findFuzzyOnce(
				this._data,
				patchHexToBytes(
					[
						// push    ebp
						'55',
						// mov     ebp, esp
						'89 E5',
						// push    edi
						'57',
						// push    esi
						'56',
						// sub     esp, 0x10
						'83 EC 10',
						// call    0xd
						'E8 00 00 00 00',
						// pop     edi
						'5F',
						// mov     eax, DWORD PTR [ebp+0xc]
						'8B 45 0C',
						// mov     ecx, DWORD PTR [eax]
						'8B 08',
						// mov     eax, DWORD PTR [eax+0x4]
						'8B 40 04',
						// mov     DWORD PTR [esp+0x8], ecx
						'89 4C 24 08',
						// test    eax, eax
						'85 C0',
						// cmove   eax, DWORD PTR [edi+...]
						'0F 44 87 -- -- -- --',
						// mov     DWORD PTR [esp+0x4], eax
						'89 44 24 04',
						// mov     eax, DWORD PTR [edi+...]
						'8B 87 -- -- -- --',
						// mov     eax, DWORD PTR [eax]
						'8B 00',
						// mov     DWORD PTR [esp], eax
						'89 04 24',
						// call    -- -- -- --
						'E8 -- -- -- --'
					].join(' ')
				)
			);
			if (found === null) {
				return false;
			}

			this._offset_ = found;
			return true;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const edi = this._vmaddr + this._offset_ + 13;
			const d = this._data;
			let i = this._offset_ + 14;

			// lea eax, [edi+...]
			d.writeUInt8(0x8d, i++);
			d.writeUInt8(0x87, i++);
			d.writeInt32LE(this._title - edi, i);
			i += 4;

			// mov ecx, DWORD PTR [eax]
			d.writeUInt8(0x8b, i++);
			d.writeUInt8(0x08, i++);

			// mov DWORD PTR [esp+0x8], ecx
			i += 4;

			// add eax, 0x4
			d.writeUInt8(0x83, i++);
			d.writeUInt8(0xc0, i++);
			d.writeUInt8(0x04, i++);

			// nop 6
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
		}
	},

	/**
	 * 13.0.0.182 x86_64.
	 */
	class extends MacProjectTitlePatchX8664 {
		private _offset_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			const found = findFuzzyOnce(
				this._data,
				patchHexToBytes(
					[
						// push    rbp
						'55',
						// mov     rbp, rsp
						'48 89 E5',
						// push    r14
						'41 56',
						// push    rbx
						'53',
						// mov     r14, rdi
						'49 89 FE',
						// mov     rdx, QWORD PTR [rsi]
						'48 8B 16',
						// mov     rsi, QWORD PTR [rsi+0x8]
						'48 8B 76 08',
						// test    rsi, rsi
						'48 85 F6',
						// cmove   rsi, QWORD PTR [rip+...]
						'48 0F 44 35 -- -- -- --',
						// mov     rax, QWORD PTR [rip+...]
						'48 8B 05 -- -- -- --',
						// mov     rdi, QWORD PTR [rax]
						'48 8B 38',
						// call    -- -- -- --
						'E8 -- -- -- --'
					].join(' ')
				)
			);
			if (found === null) {
				return false;
			}
			this._offset_ = found;
			return true;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const d = this._data;
			let i = this._offset_ + 10;

			// lea rsi, [rip+...]
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x8d, i++);
			d.writeUInt8(0x35, i++);
			d.writeInt32LE(this._title - (this._vmaddr + i + 4), i);
			i += 4;

			// movsxd rdx, DWORD PTR [rsi]
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x63, i++);
			d.writeUInt8(0x16, i++);

			// add rsi, 0x4
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x83, i++);
			d.writeUInt8(0xc6, i++);
			d.writeUInt8(0x04, i++);

			// nop 4
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
		}
	},

	/**
	 * 23.0.0.162 i386.
	 */
	class extends MacProjectTitlePatchI386 {
		private _offset_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			const found = findFuzzyOnce(
				this._data,
				patchHexToBytes(
					[
						// push    ebp
						'55',
						// mov     ebp, esp
						'89 E5',
						// push    edi
						'57',
						// push    esi
						'56',
						// sub     esp, 0x10
						'83 EC 10',
						// call    0xd
						'E8 00 00 00 00',
						// pop     edi
						'5F',
						// mov     eax, DWORD PTR [ebp+0xc]
						'8B 45 0C',
						// mov     ecx, DWORD PTR [edi+...]
						'8B 8F -- -- -- --',
						// mov     ecx, DWORD PTR [ecx]
						'8B 09',
						// mov     edx, DWORD PTR [eax]
						'8B 10',
						// mov     eax, DWORD PTR [eax+0x4]
						'8B 40 04',
						// test    eax, eax
						'85 C0',
						// cmove   eax, DWORD PTR [edi+...]
						'0F 44 87 -- -- -- --',
						// mov     DWORD PTR [esp+0x8], edx
						'89 54 24 08',
						// mov     DWORD PTR [esp+0x4], eax
						'89 44 24 04',
						// mov     DWORD PTR [esp], ecx
						'89 0C 24',
						// call    -- -- -- --
						'E8 -- -- -- --'
					].join(' ')
				)
			);
			if (found === null) {
				return false;
			}

			this._offset_ = found;
			return true;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const edi = this._vmaddr + this._offset_ + 13;
			const d = this._data;
			let i = this._offset_ + 25;

			// lea eax, [edi+...]
			d.writeUInt8(0x8d, i++);
			d.writeUInt8(0x87, i++);
			d.writeInt32LE(this._title - edi, i);
			i += 4;

			// mov edx, DWORD PTR [eax]
			d.writeUInt8(0x8b, i++);
			d.writeUInt8(0x10, i++);

			// add eax, 0x4
			d.writeUInt8(0x83, i++);
			d.writeUInt8(0xc0, i++);
			d.writeUInt8(0x04, i++);

			// nop 3
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
		}
	},

	/**
	 * 23.0.0.162 x86_64.
	 */
	class extends MacProjectTitlePatchX8664 {
		private _offset_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			const found = findFuzzyOnce(
				this._data,
				patchHexToBytes(
					[
						// push    rbp
						'55',
						// mov     rbp, rsp
						'48 89 E5',
						// push    r14
						'41 56',
						// push    rbx
						'53',
						// mov     r14, rdi
						'49 89 FE',
						// mov     rax, QWORD PTR [rip+...]
						'48 8B 05 -- -- -- --',
						// mov     rdi, QWORD PTR [rax]
						'48 8B 38',
						// mov     rdx, QWORD PTR [rsi]
						'48 8B 16',
						// mov     rsi, QWORD PTR [rsi+0x8]
						'48 8B 76 08',
						// test    rsi, rsi
						'48 85 F6',
						// cmove   rsi, QWORD PTR [rip+...]
						'48 0F 44 35 -- -- -- --',
						// call    -- -- -- --
						'E8 -- -- -- --'
					].join(' ')
				)
			);
			if (found === null) {
				return false;
			}
			this._offset_ = found;
			return true;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const d = this._data;
			let i = this._offset_ + 20;

			// lea rsi, [rip+...]
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x8d, i++);
			d.writeUInt8(0x35, i++);
			d.writeInt32LE(this._title - (this._vmaddr + i + 4), i);
			i += 4;

			// movsxd rdx, DWORD PTR [rsi]
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x63, i++);
			d.writeUInt8(0x16, i++);

			// add rsi, 0x4
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x83, i++);
			d.writeUInt8(0xc6, i++);
			d.writeUInt8(0x04, i++);

			// nop 4
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
		}
	},

	/**
	 * 35.0.0.1 x86_64.
	 */
	class extends MacProjectTitlePatchX8664 {
		private _offset_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			const found = findFuzzyOnce(
				this._data,
				patchHexToBytes(
					[
						// push    rbp
						'55',
						// mov     rbp, rsp
						'48 89 E5',
						// push    r14
						'41 56',
						// push    rbx
						'53',
						// mov     r14, rdi
						'49 89 FE',
						// mov     rax, QWORD PTR [rip+...]
						'48 8B 05 -- -- -- --',
						// mov     rdi, QWORD PTR [rax]
						'48 8B 38',
						// mov     rdx, QWORD PTR [rsi]
						'48 8B 16',
						// mov     rsi, QWORD PTR [rsi+0x8]
						'48 8B 76 08',
						// test    rsi, rsi
						'48 85 F6',
						// jne     0x1d
						'75 07',
						// lea     rsi, [rip+...]
						'48 8D 35 -- -- -- --',
						// call    -- -- -- --
						'E8 -- -- -- --'
					].join(' ')
				)
			);
			if (found === null) {
				return false;
			}
			this._offset_ = found;
			return true;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const d = this._data;
			let i = this._offset_ + 20;

			// lea rsi, [rip+...]
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x8d, i++);
			d.writeUInt8(0x35, i++);
			d.writeInt32LE(this._title - (this._vmaddr + i + 4), i);
			i += 4;

			// movsxd rdx, DWORD PTR [rsi]
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x63, i++);
			d.writeUInt8(0x16, i++);

			// add rsi, 0x4
			d.writeUInt8(0x48, i++);
			d.writeUInt8(0x83, i++);
			d.writeUInt8(0xc6, i++);
			d.writeUInt8(0x04, i++);

			// nop 5
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
			d.writeUInt8(0x90, i++);
		}
	}
];

export const macProjectTitlePatchesByCpuType = once(() => {
	const r = new Map<number, (typeof macProjectTitlePatches)[0][]>();
	for (const Patcher of macProjectTitlePatches) {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const {CPU_TYPE} = Patcher;
		const list = r.get(CPU_TYPE) || [];
		list.push(Patcher);
		r.set(CPU_TYPE, list);
	}
	return r;
});

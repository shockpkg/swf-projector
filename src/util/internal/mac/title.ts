/* eslint-disable max-classes-per-file */

import {findFuzzyOnce} from '../patch';

import {TITLE_ARM64, TITLE_I386, TITLE_X8664} from './asm';
import {CPU_TYPE_ARM64, CPU_TYPE_I386, CPU_TYPE_X86_64} from './constants';

/**
 * MacProjectTitlePatch object.
 */
export abstract class MacProjectTitlePatch {
	public static readonly CPU_TYPE: number;

	protected _data: Uint8Array;

	protected _view: DataView;

	protected _vmaddr: number;

	protected _title: number;

	/**
	 * MacProjectTitlePatch constructor.
	 *
	 * @param data Code data.
	 * @param vmaddr Code address.
	 * @param title Title address.
	 */
	constructor(data: Uint8Array, vmaddr: number, title: number) {
		this._data = data;
		this._view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength
		);
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

/**
 * MacProjectTitlePatchARM64 object.
 */
export abstract class MacProjectTitlePatchARM64 extends MacProjectTitlePatch {
	public static readonly CPU_TYPE = CPU_TYPE_ARM64;
}

export const macProjectTitlePatches: {
	CPU_TYPE: number;
	new (data: Uint8Array, vmaddr: number, title: number): MacProjectTitlePatch;
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
			const found = findFuzzyOnce(this._data, TITLE_I386['11']);
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
			const v = this._view;
			let i = this._offset_ + 11;

			// lea ecx, ...
			v.setUint8(i++, 0x8d);
			v.setUint8(i++, 0x0d);
			v.setUint32(i, this._title, true);
			i += 4;

			// mov ebx, DWORD PTR [ecx]
			v.setUint8(i++, 0x8b);
			v.setUint8(i++, 0x19);

			// add ecx, 0x4
			v.setUint8(i++, 0x83);
			v.setUint8(i++, 0xc1);
			v.setUint8(i++, 0x04);

			// nop 6
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
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
			const found = findFuzzyOnce(this._data, TITLE_X8664['11-1']);
			if (found === null) {
				return false;
			}

			// Sanity check the jump target instructions.
			const offsetJump = found + 22 + this._view.getUint8(found + 21);
			if (
				findFuzzyOnce(
					this._data.subarray(offsetJump, offsetJump + 7),
					TITLE_X8664['11-2']
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
			const v = this._view;
			let i = this._offset_ + 10;

			// lea rsi, [rip+...]
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x8d);
			v.setUint8(i++, 0x35);
			v.setUint32(i, this._title - (this._vmaddr + i + 4), true);
			i += 4;

			// movsxd rdx, DWORD PTR [rsi]
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x63);
			v.setUint8(i++, 0x16);

			// jmp --
			v.setUint8(i++, 0xeb);

			i = this._offsetJump_;

			// add rsi, 0x4
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x83);
			v.setUint8(i++, 0xc6);
			v.setUint8(i++, 0x04);

			// nop 3
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
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
			const found = findFuzzyOnce(this._data, TITLE_I386['13']);
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
			const v = this._view;
			let i = this._offset_ + 14;

			// lea eax, [edi+...]
			v.setUint8(i++, 0x8d);
			v.setUint8(i++, 0x87);
			v.setUint32(i, this._title - edi, true);
			i += 4;

			// mov ecx, DWORD PTR [eax]
			v.setUint8(i++, 0x8b);
			v.setUint8(i++, 0x08);

			// mov DWORD PTR [esp+0x8], ecx
			i += 4;

			// add eax, 0x4
			v.setUint8(i++, 0x83);
			v.setUint8(i++, 0xc0);
			v.setUint8(i++, 0x04);

			// nop 6
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
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
			const found = findFuzzyOnce(this._data, TITLE_X8664['13']);
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
			const v = this._view;
			let i = this._offset_ + 10;

			// lea rsi, [rip+...]
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x8d);
			v.setUint8(i++, 0x35);
			v.setUint32(i, this._title - (this._vmaddr + i + 4), true);
			i += 4;

			// movsxd rdx, DWORD PTR [rsi]
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x63);
			v.setUint8(i++, 0x16);

			// add rsi, 0x4
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x83);
			v.setUint8(i++, 0xc6);
			v.setUint8(i++, 0x04);

			// nop 4
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
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
			const found = findFuzzyOnce(this._data, TITLE_I386['23']);
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
			const v = this._view;
			let i = this._offset_ + 25;

			// lea eax, [edi+...]
			v.setUint8(i++, 0x8d);
			v.setUint8(i++, 0x87);
			v.setUint32(i, this._title - edi, true);
			i += 4;

			// mov edx, DWORD PTR [eax]
			v.setUint8(i++, 0x8b);
			v.setUint8(i++, 0x10);

			// add eax, 0x4
			v.setUint8(i++, 0x83);
			v.setUint8(i++, 0xc0);
			v.setUint8(i++, 0x04);

			// nop 3
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
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
			const found = findFuzzyOnce(this._data, TITLE_X8664['23']);
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
			const v = this._view;
			let i = this._offset_ + 20;

			// lea rsi, [rip+...]
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x8d);
			v.setUint8(i++, 0x35);
			v.setUint32(i, this._title - (this._vmaddr + i + 4), true);
			i += 4;

			// movsxd rdx, DWORD PTR [rsi]
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x63);
			v.setUint8(i++, 0x16);

			// add rsi, 0x4
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x83);
			v.setUint8(i++, 0xc6);
			v.setUint8(i++, 0x04);

			// nop 4
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
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
			const found = findFuzzyOnce(this._data, TITLE_X8664['35']);
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
			const v = this._view;
			let i = this._offset_ + 20;

			// lea rsi, [rip+...]
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x8d);
			v.setUint8(i++, 0x35);
			v.setUint32(i, this._title - (this._vmaddr + i + 4), true);
			i += 4;

			// movsxd rdx, DWORD PTR [rsi]
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x63);
			v.setUint8(i++, 0x16);

			// add rsi, 0x4
			v.setUint8(i++, 0x48);
			v.setUint8(i++, 0x83);
			v.setUint8(i++, 0xc6);
			v.setUint8(i++, 0x04);

			// nop 5
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
			v.setUint8(i++, 0x90);
		}
	},

	/**
	 * 35.0.0.60-release ARM64.
	 */
	class extends MacProjectTitlePatchARM64 {
		private _offset_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			const found = findFuzzyOnce(this._data, TITLE_ARM64['35-release']);
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
			const v = this._view;
			let i = this._offset_ + 32;
			const title = this._title;

			// Calculate PC relative pointer to within 12 bits (added after).
			const pc = this._vmaddr + i;
			const imm19 = Math.floor(title / 4096) - Math.floor(pc / 4096);

			// adrp x1, ? ; _title@PAGE
			v.setUint32(
				i,
				// eslint-disable-next-line no-bitwise
				(0x90000001 | ((imm19 & 3) << 29) | ((imm19 >> 2) << 5)) >>> 0,
				true
			);
			i += 4;

			// add  x1, x1, ? ; _title@PAGEOFF
			v.setUint32(
				i,
				// eslint-disable-next-line no-bitwise
				(0x91000021 | ((title & 0xfff) << 10)) >>> 0,
				true
			);
			i += 4;

			// ldr  w2, [x1] ; *((int *)_title)
			v.setUint32(i, 0xb9400022, true);
			i += 4;

			// add  x1, x1, 4 ; (char *)(_title + 4)
			v.setUint32(i, 0x91001021, true);
		}
	},

	/**
	 * 35.0.0.60-debug ARM64.
	 */
	class extends MacProjectTitlePatchARM64 {
		private _offset_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			const found = findFuzzyOnce(this._data, TITLE_ARM64['35-debug']);
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
			const v = this._view;
			let i = this._offset_ + 72;
			const title = this._title;

			// ldr  x0, [sp, #0x20] ; _kCFAllocatorDefault
			v.setUint32(i, 0xf94013e0, true);
			i += 4;

			// Calculate PC relative pointer to within 12 bits (added after).
			const pc = this._vmaddr + i;
			const imm19 = Math.floor(title / 4096) - Math.floor(pc / 4096);

			// adrp x1, ? ; _title@PAGE
			v.setUint32(
				i,
				// eslint-disable-next-line no-bitwise
				(0x90000001 | ((imm19 & 3) << 29) | ((imm19 >> 2) << 5)) >>> 0,
				true
			);
			i += 4;

			// add  x1, x1, ? ; _title@PAGEOFF
			v.setUint32(
				i,
				// eslint-disable-next-line no-bitwise
				(0x91000021 | ((title & 0xfff) << 10)) >>> 0,
				true
			);
			i += 4;

			// ldr  w2, [x1] ; *((int *)_title)
			v.setUint32(i, 0xb9400022, true);
			i += 4;

			// add  x1, x1, 4 ; (char *)(_title + 4)
			v.setUint32(i, 0x91001021, true);
		}
	}
];

let byCpuType: Map<number, (typeof macProjectTitlePatches)[0][]> | null;

/**
 * Get the projector patches mapped to CPU type.
 *
 * @param cpuType CPU type to get.
 * @returns Map of type to patcher list.
 */
export function macProjectorTitlePatchesByCpuType(cpuType: number) {
	if (!byCpuType) {
		byCpuType = new Map();
		for (const Patcher of macProjectTitlePatches) {
			const {CPU_TYPE} = Patcher;
			const list = byCpuType.get(CPU_TYPE) || [];
			list.push(Patcher);
			byCpuType.set(CPU_TYPE, list);
		}
	}
	return byCpuType.get(cpuType) || [];
}

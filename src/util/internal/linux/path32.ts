/* eslint-disable max-classes-per-file */

import {Elf32} from './elf';
import {PatchPath} from './path';

/**
 * PatchPath32 object.
 */
export abstract class PatchPath32 extends PatchPath<Elf32> {}

/**
 * PatchPath32File object.
 */
export abstract class PatchPath32File extends PatchPath32 {
	/**
	 * Relative offset.
	 */
	protected abstract readonly _relative: boolean;

	/**
	 * Fuzzy find.
	 */
	protected abstract readonly _find: string;

	/**
	 * Address offset.
	 */
	protected abstract readonly _offset: number;

	private _addr_ = 0;

	private _remap_ = 0;

	private _ebx_ = 0;

	/**
	 * @inheritDoc
	 */
	public check() {
		const {_relative: rel, _find: find, _offset: o} = this;
		for (const [shdr, i, d] of this._findFuzzyCode(find)) {
			const addr = shdr.shAddr + i;
			const ebx = rel ? this._findEbx(addr) : null;
			if (rel && ebx === null) {
				continue;
			}
			const ptr = rel
				? (ebx as number) + d.readInt32LE(i + o)
				: d.readUint32LE(i + o);
			const remap = this._getRemap(ptr);
			if (!remap) {
				continue;
			}
			if (this._addr_) {
				return false;
			}
			this._addr_ = addr;
			this._remap_ = remap;
			if (rel) {
				this._ebx_ = ebx as number;
			}
		}
		return !!this._addr_;
	}

	/**
	 * @inheritDoc
	 */
	public patch() {
		const {_relative: rel, _offset: o} = this;
		const addr = this._addr_;
		const shdr = this._theShdrForAddress(addr);
		const d = Buffer.from(shdr.data);
		const i = addr - shdr.shAddr;
		if (rel) {
			d.writeInt32LE(this._remap_ - this._ebx_, i + o);
		} else {
			d.writeUint32LE(this._remap_, i + o);
		}
	}
}

/**
 * PatchPath32FileAbs object.
 */
export abstract class PatchPath32FileAbs extends PatchPath32File {
	/**
	 * @inheritDoc
	 */
	protected readonly _relative = false;
}

/**
 * PatchPath32FileRel object.
 */
export abstract class PatchPath32FileRel extends PatchPath32File {
	/**
	 * @inheritDoc
	 */
	protected readonly _relative = true;
}

/**
 * Patch objects.
 */
export const path32 = [
	/**
	 * 9.0.115.0 i386.
	 */
	class extends PatchPath32FileAbs {
		/**
		 * @inheritDoc
		 */
		protected readonly _find = [
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
		].join(' ');

		/**
		 * @inheritDoc
		 */
		protected readonly _offset = 10;
	},

	/**
	 * 10.0.12.36 i386.
	 */
	class extends PatchPath32FileAbs {
		/**
		 * @inheritDoc
		 */
		protected readonly _find = [
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
		].join(' ');

		/**
		 * @inheritDoc
		 */
		protected readonly _offset = 16;
	},

	/**
	 * 10.1.53.64 i386.
	 */
	class extends PatchPath32FileAbs {
		/**
		 * @inheritDoc
		 */
		protected readonly _find = [
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
		].join(' ');

		/**
		 * @inheritDoc
		 */
		protected readonly _offset = 16;
	},

	/**
	 * 11.0.1.152 i386.
	 */
	class extends PatchPath32FileAbs {
		/**
		 * @inheritDoc
		 */
		protected readonly _find = [
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
		].join(' ');

		/**
		 * @inheritDoc
		 */
		protected readonly _offset = 18;
	},

	/**
	 * 11.2.202.228 i386.
	 */
	class extends PatchPath32FileRel {
		/**
		 * @inheritDoc
		 */
		protected readonly _find = [
			// lea     eax, [ebx+...]
			'8D 83 -- -- -- --',
			// xor     esi, esi
			'31 F6',
			// mov     DWORD PTR [esp+0x4], eax
			'89 44 24 04'
		].join(' ');

		/**
		 * @inheritDoc
		 */
		protected readonly _offset = 2;
	}
] as (new (elf: Elf32) => PatchPath32File)[];

/* eslint-disable max-classes-per-file */

import {Elf32} from './elf';
import {PatchPath} from './path';

export interface IPatchPathSpec32 {
	//
	/**
	 * Fuzzy find.
	 */
	find: string;

	/**
	 * Address offset.
	 */
	offset: number;

	/**
	 * Relative offset.
	 */
	relative: boolean;
}

/**
 * PatchPath32 object.
 */
export abstract class PatchPath32 extends PatchPath<Elf32> {
	/**
	 * Patch spec.
	 */
	protected abstract readonly _spec: IPatchPathSpec32;

	private _addr_ = 0;

	private _remap_ = 0;

	private _ebx_ = 0;

	/**
	 * @inheritDoc
	 */
	public check() {
		const {find, offset, relative} = this._spec;
		for (const [shdr, i, d] of this._findFuzzyCode(find)) {
			const addr = shdr.shAddr + i;
			const ebx = relative ? this._findEbx(addr) : null;
			if (relative && ebx === null) {
				continue;
			}
			const ptr = relative
				? (ebx as number) + d.readInt32LE(i + offset)
				: d.readUint32LE(i + offset);
			const remap = this._getRemap(ptr);
			if (!remap) {
				continue;
			}
			if (this._addr_) {
				return false;
			}
			this._addr_ = addr;
			this._remap_ = remap;
			if (relative) {
				this._ebx_ = ebx as number;
			}
		}
		return !!this._addr_;
	}

	/**
	 * @inheritDoc
	 */
	public patch() {
		const {offset, relative} = this._spec;
		const addr = this._addr_;
		const shdr = this._theShdrForAddress(addr);
		const d = Buffer.from(shdr.data);
		const i = addr - shdr.shAddr;
		if (relative) {
			d.writeInt32LE(this._remap_ - this._ebx_, i + offset);
		} else {
			d.writeUint32LE(this._remap_, i + offset);
		}
	}
}

/**
 * Patch objects.
 */
export const path32 = [
	/**
	 * 9.0.115.0 i386.
	 */
	class extends PatchPath32 {
		/**
		 * @inheritDoc
		 */
		protected readonly _spec = {
			find: [
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
			].join(' '),
			offset: 10,
			relative: false
		};
	},

	/**
	 * 10.0.12.36 i386.
	 */
	class extends PatchPath32 {
		/**
		 * @inheritDoc
		 */
		protected readonly _spec = {
			find: [
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
			].join(' '),
			offset: 16,
			relative: false
		};
	},

	/**
	 * 10.1.53.64 i386.
	 */
	class extends PatchPath32 {
		/**
		 * @inheritDoc
		 */
		protected readonly _spec = {
			find: [
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
			].join(' '),
			offset: 16,
			relative: false
		};
	},

	/**
	 * 11.0.1.152 i386.
	 */
	class extends PatchPath32 {
		/**
		 * @inheritDoc
		 */
		protected readonly _spec = {
			find: [
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
			].join(' '),
			offset: 18,
			relative: false
		};
	},

	/**
	 * 11.2.202.228 i386.
	 */
	class extends PatchPath32 {
		/**
		 * @inheritDoc
		 */
		protected readonly _spec = {
			find: [
				// lea     eax, [ebx+...]
				'8D 83 -- -- -- --',
				// xor     esi, esi
				'31 F6',
				// mov     DWORD PTR [esp+0x4], eax
				'89 44 24 04'
			].join(' '),
			offset: 2,
			relative: true
		};
	}
] as (new (elf: Elf32) => PatchPath32)[];

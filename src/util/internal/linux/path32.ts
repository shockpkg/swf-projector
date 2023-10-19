/* eslint-disable max-classes-per-file */

import {PATH_I386} from './asm';
import {Elf32} from './elf';
import {PatchPath} from './path';

/**
 * PatchPath32 object.
 */
export abstract class PatchPath32 extends PatchPath<Elf32> {}

/**
 * PatchPath32Dir object.
 */
abstract class PatchPath32Dir extends PatchPath32 {}

/**
 * PatchPath32File object.
 */
abstract class PatchPath32File extends PatchPath32 {
	/**
	 * Relative offset.
	 */
	protected abstract readonly _relative: boolean;

	/**
	 * Fuzzy find.
	 */
	protected abstract readonly _find: number[];

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
			const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
			const ptr = rel
				? (ebx as number) + v.getInt32(i + o, true)
				: v.getUint32(i + o, true);
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
		const v = new DataView(shdr.data);
		const i = addr - shdr.shAddr;
		if (rel) {
			v.setInt32(i + o, this._remap_ - this._ebx_, true);
		} else {
			v.setUint32(i + o, this._remap_, true);
		}
	}
}

/**
 * PatchPath32FileAbs object.
 */
abstract class PatchPath32FileAbs extends PatchPath32File {
	/**
	 * @inheritDoc
	 */
	protected readonly _relative = false;
}

/**
 * PatchPath32FileRel object.
 */
abstract class PatchPath32FileRel extends PatchPath32File {
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
	 * 6.0.79.0 i386.
	 */
	class extends PatchPath32Dir {
		private _addr_ = 0;

		/**
		 * @inheritDoc
		 */
		public check() {
			for (const [shdr, i] of this._findFuzzyCode(PATH_I386['6'])) {
				if (this._addr_) {
					return false;
				}
				this._addr_ = shdr.shAddr + i;
			}
			return !!this._addr_;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const {_addr_: addr} = this;
			const shdr = this._theShdrForAddress(addr);
			const v = new DataView(shdr.data);
			const i = addr - shdr.shAddr;

			// sIsProjector -> sExecutableName
			const ptr = v.getUint32(i + 24, true) + 4;

			// nop 2x
			v.setUint8(i + 68, 0x90);
			v.setUint8(i + 69, 0x90);

			// mov     esi, DWORD PTR ds:...
			v.setUint8(i + 70, 0x8b);
			v.setUint8(i + 71, 0x35);
			v.setUint32(i + 72, ptr, true);

			// push     esi
			v.setUint8(i + 96, 0x56);

			// push     esi
			v.setUint8(i + 122, 0x56);
		}
	},

	/**
	 * 9.0.115.0 i386.
	 */
	class extends PatchPath32FileAbs {
		/**
		 * @inheritDoc
		 */
		protected readonly _find = PATH_I386['9'];

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
		protected readonly _find = PATH_I386['10.0'];

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
		protected readonly _find = PATH_I386['10.1'];

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
		protected readonly _find = PATH_I386['11.0'];

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
		protected readonly _find = PATH_I386['11.2'];

		/**
		 * @inheritDoc
		 */
		protected readonly _offset = 2;
	}
] as (new (elf: Elf32) => PatchPath32File)[];

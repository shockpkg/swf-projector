/* eslint-disable max-classes-per-file */

import {TITLE_X8664} from './asm';
import {Elf64} from './elf';
import {PatchTitle, titleMatchA} from './title';

/**
 * PatchTitle64 object.
 */
export abstract class PatchTitle64 extends PatchTitle<Elf64> {}

/**
 * Patch objects.
 */
export const title64 = [
	/**
	 * 24.0.0.186 x86_64.
	 */
	class extends PatchTitle64 {
		private _addr_ = 0n;

		/**
		 * @inheritDoc
		 */
		public check() {
			for (const [shdr, i, d] of this._findFuzzyCode(TITLE_X8664['24'])) {
				const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
				const addr = shdr.shAddr + BigInt(i);
				const rip = addr + 7n;
				const ptr = rip + BigInt(v.getUint32(i + 3, true));
				const len = v.getUint32(i + 8, true);
				const str = this._readCstr(ptr);
				if (!str || str.length !== len || !titleMatchA.test(str)) {
					continue;
				}
				if (this._addr_) {
					return false;
				}
				this._addr_ = addr;
			}
			return !!this._addr_;
		}

		/**
		 * @inheritDoc
		 */
		public patch() {
			const addr = this._addr_;
			const shdr = this._theShdrForAddress(addr);
			const v = new DataView(shdr.data);
			const i = Number(addr - shdr.shAddr);
			const rip = shdr.shAddr + BigInt(i + 7);
			v.setUint32(i + 3, Number(this._titleA - rip), true);
			v.setUint32(i + 8, this._titleL, true);
		}
	}
] as (new (elf: Elf64, titleA: bigint, titleL: number) => PatchTitle64)[];

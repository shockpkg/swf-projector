/* eslint-disable max-classes-per-file */

import {Elf64} from './elf';
import {PatchTitle, titleMatchA} from './title';

/**
 * PatchTitle64 object.
 */
export abstract class PatchTitle64 extends PatchTitle<Elf64> {}

/**
 * Patch object.
 */
export const title64 = [
	/**
	 * All versions.
	 */
	class extends PatchTitle64 {
		private _addr_ = 0n;

		/**
		 * @inheritDoc
		 */
		public check() {
			for (const [shdr, i, d] of this._findFuzzyCode(
				[
					// lea     rsi, [rip+...]
					'48 8D 35 -- -- -- --',
					// mov     edx, ...
					'BA -- -- -- --'
				].join(' ')
			)) {
				const addr = shdr.shAddr + BigInt(i);
				const rip = addr + 7n;
				const ptr = rip + BigInt(d.readUInt32LE(i + 3));
				const len = d.readUInt32LE(i + 8);
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
			const d = Buffer.from(shdr.data);
			const i = Number(addr - shdr.shAddr);
			const rip = shdr.shAddr + BigInt(i + 7);
			d.writeUInt32LE(Number(this._titleA - rip), i + 3);
			d.writeUInt32LE(this._titleL, i + 8);
		}
	}
] as (new (elf: Elf64, titleA: bigint, titleL: number) => PatchTitle64)[];

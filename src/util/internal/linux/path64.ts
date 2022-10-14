/* eslint-disable max-classes-per-file */

import {Elf64} from './elf';
import {PatchPath} from './path';

/**
 * PatchPath64 object.
 */
export abstract class PatchPath64 extends PatchPath<Elf64> {}

/**
 * PatchPath64File object.
 */
abstract class PatchPath64File extends PatchPath64 {
	/**
	 * Fuzzy find.
	 */
	protected abstract readonly _find: string;

	/**
	 * Address offset.
	 */
	protected abstract readonly _offset: number;

	private _addr_ = 0n;

	private _remap_ = 0n;

	/**
	 * @inheritDoc
	 */
	public check() {
		const {_find: find, _offset: o} = this;
		for (const [shdr, i, d] of this._findFuzzyCode(find)) {
			const addr = shdr.shAddr + BigInt(i);
			const rip = addr + 10n;
			const ptr = rip + BigInt(d.readUInt32LE(i + o));
			const remap = this._getRemap(ptr);
			if (!remap) {
				continue;
			}
			if (this._addr_) {
				return false;
			}
			this._addr_ = addr;
			this._remap_ = remap;
		}
		return !!this._addr_;
	}

	/**
	 * @inheritDoc
	 */
	public patch() {
		const {_offset: o} = this;
		const addr = this._addr_;
		const shdr = this._theShdrForAddress(addr);
		const d = Buffer.from(shdr.data);
		const i = Number(addr - shdr.shAddr);
		const rip = shdr.shAddr + BigInt(i + 10);
		d.writeUInt32LE(Number(this._remap_ - rip), i + o);
	}
}

/**
 * Patch objects.
 */
export const path64 = [
	/**
	 * 24.0.0.186 x86_64.
	 */
	class extends PatchPath64File {
		/**
		 * @inheritDoc
		 */
		protected readonly _find = [
			// mov     r12, rsi
			'49 89 F4',
			// lea     rsi, [rip + -- -- -- --]
			'48 8D 35 -- -- -- --'
		].join(' ');

		/**
		 * @inheritDoc
		 */
		protected readonly _offset = 6;
	}
] as (new (elf: Elf64) => PatchPath64)[];

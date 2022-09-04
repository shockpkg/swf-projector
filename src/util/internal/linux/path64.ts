/* eslint-disable max-classes-per-file */

import {Elf64} from './elf';
import {PatchPath} from './path';

export interface IPatchPathSpec64 {
	//
	/**
	 * Fuzzy find.
	 */
	find: string;

	/**
	 * Address offset.
	 */
	offset: number;
}

/**
 * PatchPath64 object.
 */
export abstract class PatchPath64 extends PatchPath<Elf64> {
	/**
	 * Patch spec.
	 */
	protected abstract readonly _spec: IPatchPathSpec64;

	private _addr_ = 0n;

	private _remap_ = 0n;

	/**
	 * @inheritDoc
	 */
	public check() {
		const spec = this._spec;
		const o = spec.offset;
		for (const [shdr, i, d] of this._findFuzzyCode(spec.find)) {
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
		const o = this._spec.offset;
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
	 * All versions.
	 */
	class extends PatchPath64 {
		/**
		 * @inheritDoc
		 */
		protected readonly _spec = {
			find: [
				// mov     r12, rsi
				'49 89 F4',
				// lea     rsi, [rip + -- -- -- --]
				'48 8D 35 -- -- -- --'
			].join(' '),
			offset: 6
		};
	}
] as (new (elf: Elf64) => PatchPath64)[];

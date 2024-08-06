/* eslint-disable max-classes-per-file */

import {writeFuzzy} from '../patch.ts';

import {OFFSET_X8664} from './asm.ts';
import {Elf64} from './elf.ts';
import {Patch} from './patch.ts';

/**
 * Patch offset 64-bit spec.
 */
export interface IPatchOffset64Spec {
	/**
	 * Fuzzy find.
	 */
	find: number[];

	/**
	 * Fuzzy replace.
	 */
	replace: number[];
}

/**
 * PatchOffset64 object.
 * Replace the bad ELF header reading logic with new logic.
 * The code was never updated from the old 32-bit code and is not accurate.
 */
export abstract class PatchOffset64 extends Patch<Elf64> {
	/**
	 * Patch spec.
	 */
	protected abstract _spec: IPatchOffset64Spec;

	private _replace_ = [] as [Uint8Array, number, number[]][];

	/**
	 * @inheritDoc
	 */
	public check() {
		this._replace_ = [];
		const {find, replace} = this._spec;
		const rep = [] as [Uint8Array, number, number[]][];
		for (const [, i, d] of this._findFuzzyCode(find)) {
			if (rep.length) {
				return false;
			}
			rep.push([d, i, replace]);
		}
		if (rep.length !== 1) {
			return false;
		}
		this._replace_ = rep;
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public patch() {
		for (const [d, i, f] of this._replace_) {
			writeFuzzy(d, i, f);
		}
	}
}

/**
 * Patch objects.
 */
export const offset64 = [
	/**
	 * 24.0.0.186 x86_64.
	 */
	class extends PatchOffset64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = {
			find: OFFSET_X8664['24-a'],
			replace: OFFSET_X8664['24-b']
		};
	},

	/**
	 * 25.0.0.127 x86_64.
	 */
	class extends PatchOffset64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = {
			find: OFFSET_X8664['25-a'],
			replace: OFFSET_X8664['25-b']
		};
	},

	/**
	 * 32.0.0.293 x86_64.
	 */
	class extends PatchOffset64 {
		/**
		 * @inheritDoc
		 */
		protected _spec = {
			find: OFFSET_X8664['32-a'],
			replace: OFFSET_X8664['32-b']
		};
	}
] as (new (elf: Elf64) => PatchOffset64)[];

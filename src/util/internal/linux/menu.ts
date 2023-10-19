import {patchHexToBytes, writeFuzzy} from '../patch';

import {Elf32, Elf64} from './elf';
import {Patch} from './patch';

/**
 * Patch menu spec.
 */
export interface IPatchMenuSpec {
	/**
	 * Expected number of replacements.
	 */
	count: number;

	/**
	 * Fuzzy find.
	 */
	find: string;

	/**
	 * Fuzzy replace.
	 */
	replace: string;
}

/**
 * PatchMenu object.
 */
export abstract class PatchMenu<T extends Elf32 | Elf64> extends Patch<T> {
	/**
	 * Patch spec.
	 */
	protected abstract _spec: IPatchMenuSpec[];

	private _replace_ = [] as [Uint8Array, number, string][];

	/**
	 * @inheritDoc
	 */
	public check() {
		this._replace_ = [];
		const rep = [] as [Uint8Array, number, string][];
		for (const {count, find, replace} of this._spec) {
			let found = 0;
			for (const [, i, d] of this._findFuzzyCode(find)) {
				found++;
				rep.push([d, i, replace]);
				if (found > count) {
					return false;
				}
			}
			if (found !== count) {
				return false;
			}
		}
		this._replace_ = rep;
		return !!rep.length;
	}

	/**
	 * @inheritDoc
	 */
	public patch() {
		for (const [d, i, h] of this._replace_) {
			writeFuzzy(d, i, patchHexToBytes(h));
		}
	}
}

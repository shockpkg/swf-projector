/* eslint-disable max-classes-per-file */

import {findFuzzy} from '../patch';

import {PATCH_I386} from './asm';
import {Elf32, Elf32Shdr, Elf64, EM_386} from './elf';

type Unpacked<T> = T extends (infer U)[] ? U : T;

/**
 * Patch object.
 */
export abstract class Patch<T extends Elf32 | Elf64> {
	/**
	 * ELF object.
	 */
	protected _elf: T;

	/**
	 * Patch constructor.
	 *
	 * @param elf ELF object.
	 */
	constructor(elf: T) {
		this._elf = elf;
	}

	/**
	 * Get shdr for address.
	 *
	 * @param addr The address.
	 * @returns The shdr or null.
	 */
	protected _getShdrForAddress(addr: number | bigint) {
		for (const shdr of this._elf.sectionHeaders) {
			const {shAddr} = shdr;
			if (
				addr >= shAddr &&
				addr < (shAddr as number) + (shdr.shSize as number)
			) {
				return shdr as Unpacked<T['sectionHeaders']>;
			}
		}
		return null;
	}

	/**
	 * The shdr for address or throw.
	 *
	 * @param addr The address.
	 * @returns The shdr.
	 */
	protected _theShdrForAddress(addr: number | bigint) {
		const shdr = this._getShdrForAddress(addr);
		if (!shdr) {
			throw new Error(`No section at address: ${addr.toString()}`);
		}
		return shdr;
	}

	/**
	 * Fuzzy find in code.
	 *
	 * @param find Fuzzy find.
	 * @yields The shdr and index in shdr.
	 */
	protected *_findFuzzyCode(find: number[]) {
		const shdr = this._getShdrForAddress(this._elf.elfHeader.eEntry);
		if (!shdr) {
			return;
		}
		const d = new Uint8Array(shdr.data);
		for (const i of findFuzzy(d, find)) {
			yield [shdr, i, d] as [
				Unpacked<T['sectionHeaders']>,
				number,
				Uint8Array
			];
		}
	}

	/**
	 * Get ebx for code at address.
	 *
	 * @param addr The address.
	 * @returns The value of ebd or null if value not found.
	 */
	protected _findEbx(addr: number) {
		if (this._elf.bits !== 32 || this._elf.elfHeader.eMachine !== EM_386) {
			throw new Error('Unsupported architecture');
		}
		const shdr = this._theShdrForAddress(addr) as Elf32Shdr;
		const d = new Uint8Array(shdr.data);
		const v = new DataView(shdr.data);
		const before = addr - shdr.shAddr;
		for (const i of findFuzzy(d, PATCH_I386['ebx'], 0, before, true)) {
			return shdr.shAddr + i + 5 + v.getUint32(i + 7, true);
		}
		return null;
	}

	/**
	 * Read C-String from address.
	 *
	 * @param addr String address.
	 * @returns The C-String or null if invalid.
	 */
	protected _readCstr(addr: number | bigint) {
		const shdr = this._getShdrForAddress(addr);
		if (!shdr) {
			return null;
		}
		const d = new Uint8Array(shdr.data);
		const s = Number(addr) - Number(shdr.shAddr);
		const e = d.length;
		for (let i = s; i < e; i++) {
			if (!d[i]) {
				return String.fromCharCode(...d.subarray(s, i));
			}
		}
		return null;
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

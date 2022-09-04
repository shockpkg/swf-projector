import {Elf32, Elf64} from './elf';
import {Patch} from './patch';

/**
 * PatchPath object.
 * Patch broken Linux projector path code.
 * Replaces bad "file:" prefix with "file://" for projector self URL.
 */
export abstract class PatchPath<T extends Elf32 | Elf64> extends Patch<T> {
	/**
	 * Get a remapped pointer, if pointer needs remapping.
	 *
	 * @param ptr Current pointer.
	 * @returns Remapped pointer or null.
	 */
	protected _getRemap(ptr: number | bigint) {
		const str = this._readCstr(ptr);
		if (str !== 'file:') {
			return null;
		}
		const shdr = this._theShdrForAddress(ptr);
		const data = Buffer.from(shdr.data);
		const fileI = data.indexOf('\0file:///\0', 0, 'ascii') + 1;
		if (!fileI) {
			return null;
		}
		return (
			this._elf.bits === 64
				? (shdr.shAddr as bigint) + BigInt(fileI)
				: (shdr.shAddr as number) + fileI
		) as T['elfHeader']['eEntry'];
	}
}
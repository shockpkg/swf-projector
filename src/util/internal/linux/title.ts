import {Elf32, Elf64} from './elf';
import {Patch} from './patch';

// Match all known titles.
export const titleMatchM = /^Macromedia Flash Player \d$/;
export const titleMatchA = /^Adobe Flash Player \d+(,\d+,\d+,\d+)?$/;

/**
 * PatchTitle object.
 */
export abstract class PatchTitle<T extends Elf32 | Elf64> extends Patch<T> {
	/**
	 * New title address.
	 */
	protected readonly _titleA: T['elfHeader']['eEntry'];

	/**
	 * New title length, without null termination.
	 */
	protected readonly _titleL: number;

	/**
	 * PatchTitle constructor.
	 *
	 * @param elf ELF object.
	 * @param titleA New title address.
	 * @param titleL New title length, without null termination.
	 */
	constructor(elf: T, titleA: T['elfHeader']['eEntry'], titleL: number) {
		super(elf);

		this._titleA = titleA;
		this._titleL = titleL;
	}
}

import {
	Data
} from './data';

/**
 * Tag class.
 */
export class Tag extends Data {
	/**
	 * Tag code.
	 */
	public code: number = 0;

	/**
	 * Tag data.
	 */
	public data: Buffer = Buffer.alloc(0);

	constructor() {
		super();
	}

	/**
	 * Is the tag a long tag.
	 *
	 * @returns True if long tag.
	 */
	public get long() {
		return this.data.length >= 0b111111;
	}

	/**
	 * Encode size.
	 *
	 * @returns The size.
	 */
	public get size() {
		return 2 + (this.long ? 4 : 0) + this.data.length;
	}

	/**
	 * Encode data into buffer.
	 *
	 * @param data Buffer to encode into.
	 */
	public encoder(data: Buffer) {
		let i = 0;
		const {code, data: d, long} = this;
		// eslint-disable-next-line no-bitwise
		const head = (code << 6) | (long ? 0b111111 : d.length);
		data.writeUInt16LE(head, i);
		i += 2;
		if (long) {
			data.writeUInt32LE(d.length, i);
			i += 4;
		}
		d.copy(data, i);
	}
}

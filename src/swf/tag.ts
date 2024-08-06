import {Data} from './data.ts';

/**
 * Tag object.
 */
export class Tag extends Data {
	/**
	 * Tag code.
	 */
	public code: number = 0;

	/**
	 * Tag data.
	 */
	public data: Uint8Array = new Uint8Array(0);

	/**
	 * Tag constructor.
	 */
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
	 * @inheritdoc
	 */
	public get size() {
		return 2 + (this.long ? 4 : 0) + this.data.length;
	}

	/**
	 * @inheritdoc
	 */
	public encoder(data: Uint8Array) {
		let i = 0;
		const {code, data: d, long} = this;
		// eslint-disable-next-line no-bitwise
		const head = (code << 6) | (long ? 0b111111 : d.length);
		const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
		v.setUint16(i, head, true);
		i += 2;
		if (long) {
			v.setUint32(i, d.length, true);
			i += 4;
		}
		data.set(d, i);
	}
}

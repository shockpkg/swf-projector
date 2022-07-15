import {Data} from './data';
import {bitCountS, bitCountToBytes, bitWriter} from './util';

/**
 * Rect object.
 */
export class Rect extends Data {
	/**
	 * Minimum X.
	 */
	public xMin: number = 0;

	/**
	 * Maximum X.
	 */
	public xMax: number = 0;

	/**
	 * Minimum Y.
	 */
	public yMin: number = 0;

	/**
	 * Maximum Y.
	 */
	public yMax: number = 0;

	/**
	 * Rect constructor.
	 */
	constructor() {
		super();
	}

	/**
	 * Number of bits need to encode the values.
	 *
	 * @returns Bit count.
	 */
	public get nBits() {
		return Math.max(
			bitCountS(this.xMin),
			bitCountS(this.xMax),
			bitCountS(this.yMin),
			bitCountS(this.yMax)
		);
	}

	/**
	 * Encode size.
	 *
	 * @returns The size.
	 */
	public get size() {
		return bitCountToBytes(5 + this.nBits * 4);
	}

	/**
	 * Encode data into buffer.
	 *
	 * @param data Buffer to encode into.
	 */
	public encoder(data: Buffer) {
		const {nBits} = this;
		const bW = bitWriter(data, 0);
		let b = 0;
		bW(nBits, 5, b);
		b += 5;
		for (const value of [this.xMin, this.xMax, this.yMin, this.yMax]) {
			bW(value, nBits, b);
			b += nBits;
		}
		const over = b % 8;
		if (over) {
			bW(0, 8 - over, b);
		}
	}
}

import {Data} from './data';

/**
 * Fixed8 object.
 */
export class Fixed8 extends Data {
	/**
	 * Float numerator.
	 */
	public numerator: number = 0;

	/**
	 * Float denominator.
	 */
	public denominator: number = 0;

	/**
	 * Fixed8 constructor.
	 */
	constructor() {
		super();
	}

	/**
	 * Encode size.
	 *
	 * @returns The size.
	 */
	public get size() {
		return 2;
	}

	/**
	 * Value.
	 *
	 * @param value The value.
	 */
	public set value(value) {
		const i16 = Math.floor(value * 256);
		// eslint-disable-next-line no-bitwise
		this.numerator = (i16 >> 8) & 0xff;
		// eslint-disable-next-line no-bitwise
		this.denominator = i16 & 0xff;
	}

	/**
	 * Value.
	 *
	 * @returns The value.
	 */
	public get value() {
		// eslint-disable-next-line no-bitwise
		const i16 = (this.numerator << 8) | this.denominator;
		return i16 / 256;
	}

	/**
	 * Encode data into buffer.
	 *
	 * @param data Buffer to encode into.
	 */
	public encoder(data: Buffer) {
		data.writeUInt8(this.denominator, 0);
		data.writeUInt8(this.numerator, 1);
	}
}

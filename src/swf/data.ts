import {subview} from './util';

/**
 * Data object.
 */
export abstract class Data {
	/**
	 * Data constructor.
	 */
	constructor() {}

	/**
	 * Encode size.
	 *
	 * @returns The size.
	 */
	public abstract get size(): number;

	/**
	 * Encode into data.
	 *
	 * @param data Data encode target.
	 */
	public abstract encoder(data: Uint8Array): void;

	/**
	 * Encode into data at offset, or new data.
	 *
	 * @param data The buffer to use.
	 * @param offset Offset in the buffer.
	 * @returns Encoded data.
	 */
	public encode(data: Uint8Array | null = null, offset = 0) {
		const {size} = this;
		data = data ? subview(data, offset, size) : new Uint8Array(size);
		this.encoder(data);
		return data;
	}
}

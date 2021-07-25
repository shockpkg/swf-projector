
import {
	subview
} from './util';

/**
 * Data class.
 */
export abstract class Data extends Object {
	constructor() {
		super();
	}

	/**
	 * Encode size.
	 *
	 * @returns The size.
	 */
	public abstract get size(): number;

	/**
	 * Encode data into buffer.
	 *
	 * @param data Buffer to encode into.
	 */
	public abstract encoder(data: Buffer): void;

	/**
	 * Encode data into buffer at offset, or create new buffer.
	 *
	 * @param data The buffer to use.
	 * @param offset Offset in the buffer.
	 * @returns Buffer of the movie.
	 */
	public encode(data: Buffer | null = null, offset = 0) {
		const {size} = this;
		data = data ? subview(data, offset, size) : Buffer.alloc(size);
		this.encoder(data);
		return data;
	}
}

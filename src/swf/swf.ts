import {
	Data
} from './data';
import {
	Rect
} from './rect';
import {
	Fixed8
} from './fixed8';
import {
	Tag
} from './tag';

/**
 * Swf class.
 */
export class Swf extends Data {
	/**
	 * Format version.
	 */
	public version: number = 0;

	/**
	 * Frame size.
	 */
	public frameSize: Rect = new Rect();

	/**
	 * Frame rate.
	 */
	public frameRate: Fixed8 = new Fixed8();

	/**
	 * Frame count.
	 */
	public frameCount: number = 0;

	/**
	 * Movie tags.
	 */
	public tags: Tag[] = [];

	constructor() {
		super();
	}

	/**
	 * Encode size.
	 *
	 * @returns The size.
	 */
	public get size() {
		return this.tags.reduce(
			(v, t) => t.size + v,
			3 + 1 + 4 + this.frameSize.size + this.frameRate.size + 2
		);
	}

	/**
	 * Encode data into buffer.
	 *
	 * @param data Buffer to encode into.
	 */
	public encoder(data: Buffer) {
		let i = 0;
		data.write('FWS', i, 'ascii');
		i += 3;

		data.writeUInt8(this.version, i++);

		data.writeUInt32LE(this.size, i);
		i += 4;

		i += this.frameSize.encode(data, i).length;

		i += this.frameRate.encode(data, i).length;

		data.writeUInt16LE(this.frameCount, i);
		i += 2;

		for (const tag of this.tags) {
			i += tag.encode(data, i).length;
		}
	}
}

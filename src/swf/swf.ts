import {Data} from './data.ts';
import {Rect} from './rect.ts';
import {Fixed8} from './fixed8.ts';
import {Tag} from './tag.ts';

/**
 * Swf object.
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

	/**
	 * Swf constructor.
	 */
	constructor() {
		super();
	}

	/**
	 * @inheritdoc
	 */
	public get size() {
		return this.tags.reduce(
			(v, t) => t.size + v,
			3 + 1 + 4 + this.frameSize.size + this.frameRate.size + 2
		);
	}

	/**
	 * @inheritdoc
	 */
	public encoder(data: Uint8Array) {
		let i = 0;
		data[i++] = 0x46;
		data[i++] = 0x57;
		data[i++] = 0x53;
		data[i++] = this.version;

		const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
		v.setUint32(i, this.size, true);
		i += 4;

		i += this.frameSize.encode(data, i).length;

		i += this.frameRate.encode(data, i).length;

		v.setUint16(i, this.frameCount, true);
		i += 2;

		for (const tag of this.tags) {
			i += tag.encode(data, i).length;
		}
	}
}

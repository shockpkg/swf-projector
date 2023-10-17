import {readFile} from 'node:fs/promises';

import {fsLstatExists} from '@shockpkg/archive-files';

/**
 * Projector object.
 */
export abstract class Projector {
	/**
	 * Set the nobrowse option on mounted disk images.
	 */
	public nobrowse = false;

	/**
	 * Projector Player.
	 */
	public player: string | null = null;

	/**
	 * Output path.
	 */
	public readonly path: string;

	/**
	 * Projector constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		this.path = path;
	}

	/**
	 * The movie appended magic.
	 *
	 * @returns Magic integer.
	 */
	public get movieMagic() {
		return 0xfa123456;
	}

	/**
	 * Write out projector with file.
	 *
	 * @param movieFile Movie file.
	 */
	public async withFile(movieFile: string | null) {
		const movieData = movieFile ? await readFile(movieFile) : null;
		await this.withData(movieData);
	}

	/**
	 * Write out projector with data.
	 *
	 * @param movieData Movie data.
	 */
	public async withData(movieData: Readonly<Buffer> | null) {
		const {player} = this;
		if (!player) {
			throw new Error('No projector player configured');
		}

		await this._checkOutput();
		await this._writePlayer(player);
		await this._modifyPlayer(movieData);
	}

	/**
	 * Check that output path is valid, else throws.
	 */
	protected async _checkOutput() {
		if (await fsLstatExists(this.path)) {
			throw new Error(`Output path already exists: ${this.path}`);
		}
	}

	/**
	 * Encode movie data for the projector.
	 * Format string characters:
	 * - d: Movie data.
	 * - m: Magic, 32LE.
	 * - M: Magic, 32BE.
	 * - i: Magic, 64LE.
	 * - I: Magic, 64BE.
	 * - s: Size, 32LE.
	 * - S: Size, 32BE.
	 * - l: Size, 64LE.
	 * - L: Size, 64BE.
	 *
	 * @param data Movie data.
	 * @param format Format string.
	 * @returns Encoded data.
	 */
	protected _encodeMovieData(data: Readonly<Buffer>, format: string) {
		const buffers: Readonly<Buffer>[] = [];
		for (const c of format) {
			switch (c) {
				case 'd': {
					buffers.push(data);
					break;
				}
				case 'm': {
					const b = Buffer.alloc(4);
					b.writeUInt32LE(this.movieMagic, 0);
					buffers.push(b);
					break;
				}
				case 'M': {
					const b = Buffer.alloc(4);
					b.writeUInt32BE(this.movieMagic, 0);
					buffers.push(b);
					break;
				}
				case 'i': {
					const b = Buffer.alloc(8);
					const {movieMagic: movieAppendMarker} = this;
					// eslint-disable-next-line no-bitwise
					b.writeInt32LE(movieAppendMarker >> 0, 0);
					// eslint-disable-next-line no-bitwise
					b.writeInt32LE(movieAppendMarker >> 31, 4);
					buffers.push(b);
					break;
				}
				case 'I': {
					const b = Buffer.alloc(8);
					const {movieMagic: movieAppendMarker} = this;
					// eslint-disable-next-line no-bitwise
					b.writeInt32BE(movieAppendMarker >> 0, 4);
					// eslint-disable-next-line no-bitwise
					b.writeInt32BE(movieAppendMarker >> 31, 0);
					buffers.push(b);
					break;
				}
				case 's': {
					const b = Buffer.alloc(4);
					b.writeUInt32LE(data.length, 0);
					buffers.push(b);
					break;
				}
				case 'S': {
					const b = Buffer.alloc(4);
					b.writeUInt32BE(data.length, 0);
					buffers.push(b);
					break;
				}
				case 'l': {
					// 64-bit, just write 32-bit, SWF cannot be larger.
					const b = Buffer.alloc(8, 0);
					b.writeUInt32LE(data.length, 0);
					buffers.push(b);
					break;
				}
				case 'L': {
					// 64-bit, just write 32-bit, SWF cannot be larger.
					const b = Buffer.alloc(8, 0);
					b.writeUInt32BE(data.length, 4);
					buffers.push(b);
					break;
				}
				default: {
					throw new Error(`Unknown format string character: ${c}`);
				}
			}
		}
		return Buffer.concat(buffers);
	}

	/**
	 * Projector file extension.
	 *
	 * @returns File extension.
	 */
	public abstract get extension(): string;

	/**
	 * Write the projector player.
	 *
	 * @param player Player path.
	 */
	protected abstract _writePlayer(player: string): Promise<void>;

	/**
	 * Modify the projector player.
	 *
	 * @param movieData Movie data or null.
	 */
	protected abstract _modifyPlayer(
		movieData: Readonly<Buffer> | null
	): Promise<void>;
}

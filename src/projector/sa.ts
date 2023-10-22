import {readFile} from 'node:fs/promises';

import {fsLstatExists} from '@shockpkg/archive-files';

import {concat} from '../util/internal/data';
import {Projector} from '../projector';

/**
 * File patch.
 */
export interface IFilePatch {
	/**
	 * Check if player file path matches.
	 *
	 * @param file File path.
	 * @returns If matched.
	 */
	match: (file: string) => boolean;

	/**
	 * Modify data, possibly inplace.
	 *
	 * @param data The data to modify.
	 * @returns Modified data.
	 */
	modify: (data: Uint8Array) => Promise<Uint8Array> | Uint8Array;

	/**
	 * Run after all patches.
	 */
	after: () => Promise<void> | void;
}

/**
 * File filter.
 */
export interface IFileFilter {
	/**
	 * Check if player file path matches.
	 *
	 * @param file File path.
	 * @returns If excluded.
	 */
	match: (file: string) => boolean;
}

/**
 * ProjectorSa object.
 */
export abstract class ProjectorSa extends Projector {
	/**
	 * ProjectorSa Player.
	 */
	public player: string | null = null;

	/**
	 * Movie data.
	 */
	public movieData:
		| Readonly<Uint8Array>
		| (() => Readonly<Uint8Array>)
		| (() => Promise<Readonly<Uint8Array>>)
		| null = null;

	/**
	 * Movie file.
	 */
	public movieFile: string | null = null;

	/**
	 * ProjectorSa constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
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
	 * @inheritdoc
	 */
	public async write() {
		const {player} = this;
		if (!player) {
			throw new Error('No projector player configured');
		}

		await this._checkOutput();
		await this._writePlayer(player);
	}

	/**
	 * Get movie file data.
	 *
	 * @returns Movie data or null.
	 */
	public async getMovieData() {
		const {movieData, movieFile} = this;
		if (movieData) {
			return typeof movieData === 'function' ? movieData() : movieData;
		}
		if (movieFile) {
			const d = await readFile(movieFile);
			return new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
		}
		return null;
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
	protected _encodeMovieData(data: Readonly<Uint8Array>, format: string) {
		const parts: Readonly<Uint8Array>[] = [];
		for (const c of format) {
			switch (c) {
				case 'd': {
					parts.push(data);
					break;
				}
				case 'm':
				case 'M': {
					const b = new ArrayBuffer(4);
					const v = new DataView(b);
					v.setUint32(0, this.movieMagic, c === 'm');
					parts.push(new Uint8Array(b));
					break;
				}
				case 'i':
				case 'I': {
					// 32-bit integer, sign extended to 64-bit.
					const b = new ArrayBuffer(8);
					const v = new DataView(b);
					const {movieMagic} = this;
					if (c === 'i') {
						// eslint-disable-next-line no-bitwise
						v.setInt32(0, movieMagic >> 0, true);
						// eslint-disable-next-line no-bitwise
						v.setInt32(4, movieMagic >> 31, true);
					} else {
						// eslint-disable-next-line no-bitwise
						v.setInt32(4, movieMagic >> 0, false);
						// eslint-disable-next-line no-bitwise
						v.setInt32(0, movieMagic >> 31, false);
					}
					parts.push(new Uint8Array(b));
					break;
				}
				case 's':
				case 'S': {
					const b = new ArrayBuffer(4);
					const v = new DataView(b);
					v.setUint32(0, data.length, c === 's');
					parts.push(new Uint8Array(b));
					break;
				}
				case 'l':
				case 'L': {
					// 64-bit, just write 32-bit, SWF cannot be larger.
					const b = new ArrayBuffer(8);
					const v = new DataView(b);
					if (c === 'l') {
						v.setUint32(0, data.length, true);
					} else {
						v.setUint32(4, data.length, false);
					}
					parts.push(new Uint8Array(b));
					break;
				}
				default: {
					throw new Error(`Unknown format string character: ${c}`);
				}
			}
		}
		return concat(parts);
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
}

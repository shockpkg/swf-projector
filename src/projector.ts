import {
	basename
} from 'path';

import {
	Archive,
	ArchiveDir,
	ArchiveHdi,
	createArchiveByFileExtension
} from '@shockpkg/archive-files';
import fse from 'fs-extra';

import {
	trimExtension
} from './util';

/**
 * Projector constructor.
 *
 * @param path Output path.
 */
export abstract class Projector extends Object {
	/**
	 * Player file or directory.
	 */
	public player: string | null = null;

	/**
	 * Movie file.
	 */
	public movieFile: string | null = null;

	/**
	 * Movie data.
	 */
	public movieData: Buffer | null = null;

	/**
	 * Path to hdiutil binary.
	 */
	public pathToHdiutil: string | null = null;

	/**
	 * Output path.
	 */
	public readonly path: string;

	constructor(path: string) {
		super();

		this.path = path;
	}

	/**
	 * The movie appended marker.
	 *
	 * @returns Hex string.
	 */
	public get movieAppendMarker() {
		return '563412FA';
	}

	/**
	 * Get movie data if any specified, from data or file.
	 *
	 * @returns Movie data or null.
	 */
	public async getMovieData() {
		const {movieData, movieFile} = this;
		return movieData || (movieFile ? fse.readFile(movieFile) : null);
	}

	/**
	 * Get the name of a projector trimming the extension.
	 *
	 * @returns Projector name without extension.
	 */
	public getProjectorName() {
		const name = basename(this.path);
		return trimExtension(name, this.projectorExtension, true);
	}

	/**
	 * Get the player path, or throw.
	 *
	 * @returns Player path.
	 */
	public getPlayerPath() {
		const {player} = this;
		if (!player) {
			throw new Error('Player must be set');
		}
		return player;
	}

	/**
	 * Get the player file or directory as an Archive instance.
	 *
	 * @param path File path.
	 * @returns Archive instance.
	 */
	public async openAsArchive(path: string): Promise<Archive> {
		const stat = await fse.stat(path);
		if (stat.isDirectory()) {
			return new ArchiveDir(path);
		}
		if (!stat.isFile()) {
			throw new Error(`Archive path not file or directory: ${path}`);
		}

		const r = createArchiveByFileExtension(path);
		if (!r) {
			throw new Error(`Archive file type unknown: ${path}`);
		}

		if (r instanceof ArchiveHdi) {
			const {pathToHdiutil} = this;
			if (pathToHdiutil) {
				r.mounterMac.hdiutil = pathToHdiutil;
			}
			r.nobrowse = true;
		}
		return r;
	}

	/**
	 * Write out the projector.
	 */
	public async write() {
		await this._writePlayer();
		await this._modifyPlayer();
		await this._writeMovie();
	}

	/**
	 * Append movie data to a file.
	 * Format string characters:
	 * - d: Movie data.
	 * - m: Marker bytes.
	 * - s: Size, 32LE.
	 * - S: Size, 32BE.
	 * - l: Size, 64LE.
	 * - L: Size, 64BE.
	 *
	 * @param file File to append to.
	 * @param data Movie data.
	 * @param format Format string.
	 */
	protected async _appendMovieData(
		file: string,
		data: Readonly<Buffer>,
		format: string
	) {
		const buffers: Readonly<Buffer>[] = [];
		for (const c of format) {
			switch (c) {
				case 'd': {
					buffers.push(data);
					break;
				}
				case 'm': {
					buffers.push(Buffer.from(this.movieAppendMarker, 'hex'));
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

		const stat = await fse.stat(file);
		if (!stat.isFile()) {
			throw new Error(`Path not a file: ${file}`);
		}

		const fd = await fse.open(file, 'a');
		try {
			for (const b of buffers) {
				// eslint-disable-next-line no-await-in-loop
				await fse.appendFile(fd, b);
			}
		}
		finally {
			await fse.close(fd);
		}
	}

	/**
	 * Projector file extension.
	 *
	 * @returns File extension.
	 */
	public abstract get projectorExtension(): string;

	/**
	 * Write the projector player.
	 */
	protected abstract async _writePlayer(): Promise<void>;

	/**
	 * Modify the projector player.
	 */
	protected abstract async _modifyPlayer(): Promise<void>;

	/**
	 * Write out the projector movie file.
	 */
	protected abstract async _writeMovie(): Promise<void>;
}

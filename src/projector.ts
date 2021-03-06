import {
	Archive,
	ArchiveDir,
	ArchiveHdi,
	createArchiveByFileExtension
} from '@shockpkg/archive-files';
import fse from 'fs-extra';

/**
 * Projector constructor.
 *
 * @param path Output path.
 */
export abstract class Projector extends Object {
	/**
	 * Path to hdiutil binary.
	 */
	public hdiutil: string | null = null;

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
			const {hdiutil} = this;
			if (hdiutil) {
				r.mounterMac.hdiutil = hdiutil;
			}
			r.nobrowse = true;
		}
		return r;
	}

	/**
	 * Write out projector with player and file.
	 *
	 * @param player Player path.
	 * @param movieFile Movie file.
	 */
	public async withFile(player: string, movieFile: string | null) {
		const movieData = movieFile ? await fse.readFile(movieFile) : null;
		await this.withData(player, movieData);
	}

	/**
	 * Write out projector with player and data.
	 *
	 * @param player Player path.
	 * @param movieData Movie data.
	 */
	public async withData(player: string, movieData: Readonly<Buffer> | null) {
		await this._checkOutput();
		await this._writePlayer(player);
		await this._modifyPlayer();
		await this._writeMovie(movieData);
	}

	/**
	 * Check that output path is valid, else throws.
	 */
	protected async _checkOutput() {
		if (await fse.pathExists(this.path)) {
			throw new Error(`Output path already exists: ${this.path}`);
		}
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
	public abstract get extension(): string;

	/**
	 * Write the projector player.
	 *
	 * @param player Player path.
	 */
	protected abstract _writePlayer(player: string): Promise<void>;

	/**
	 * Modify the projector player.
	 */
	protected abstract _modifyPlayer(): Promise<void>;

	/**
	 * Write out the projector movie file.
	 *
	 * @param movieData Movie data or null.
	 */
	protected abstract _writeMovie(
		movieData: Readonly<Buffer> | null
	): Promise<void>;
}

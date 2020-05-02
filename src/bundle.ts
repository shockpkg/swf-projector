import {
	Readable,
	pipeline
} from 'stream';
import {
	join as pathJoin,
	dirname,
	basename,
	resolve
} from 'path';
import {
	promisify
} from 'util';

import fse from 'fs-extra';
import {
	fsLchmodSupported,
	fsLchmod,
	fsLutimesSupported,
	fsLutimes,
	fsWalk,
	fsLstatExists
} from '@shockpkg/archive-files';

import {once} from './util';
import {Projector} from './projector';

const pipelineP = promisify(pipeline);

const userExec = 0b001000000;

/**
 * Options for adding resources.
 */
export interface IBundleResourceOptions {

	/**
	 * Access time.
	 */
	atime?: null | Date;

	/**
	 * Copy source atime if not set.
	 */
	atimeCopy?: null | boolean;

	/**
	 * Modification time.
	 */
	mtime?: null | Date;

	/**
	 * Copy source mtime if not set.
	 */
	mtimeCopy?: null | boolean;

	/**
	 * Mark files and symlinks as executable.
	 */
	executable?: null | boolean;

	/**
	 * Copy source executable if not set.
	 */
	executableCopy?: null | boolean;

	/**
	 * Optionally merge directory contents.
	 */
	merge?: null | boolean;

	/**
	 * Skip recursive directory copy.
	 */
	noRecurse?: null | boolean;
}

/**
 * Bundle constructor.
 *
 * @param path Output path for the main executable.
 */
export abstract class Bundle extends Object {
	/**
	 * File and directory names to exclude when adding a directory.
	 */
	public excludes = [
		/^\./,
		/^ehthumbs\.db$/,
		/^Thumbs\.db$/
	];

	/**
	 * Bundle main executable path.
	 */
	public readonly path: string;

	/**
	 * Projector instance.
	 */
	public abstract readonly projector: Projector;

	/**
	 * Open flag.
	 */
	protected _isOpen = false;

	/**
	 * Close callbacks priority queue.
	 */
	protected _closeCallbacks: (() => Promise<any>)[][] = [];

	constructor(path: string) {
		super();

		this.path = path;
	}

	/**
	 * Check if output open.
	 *
	 * @returns Returns true if open, else false.
	 */
	public get isOpen() {
		return this._isOpen;
	}

	/**
	 * Check if name is excluded file.
	 *
	 * @param name File name.
	 * @returns Returns true if excluded, else false.
	 */
	public isExcludedFile(name: string) {
		for (const exclude of this.excludes) {
			if (exclude.test(name)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Open output with file.
	 *
	 * @param player Player path.
	 * @param movieFile Movie file.
	 */
	public async openFile(player: string, movieFile: string | null) {
		const movieData = movieFile ? await fse.readFile(movieFile) : null;
		await this.openData(player, movieData);
	}

	/**
	 * Open output with data.
	 *
	 * @param player Player path.
	 * @param movieData Movie data.
	 */
	public async openData(player: string, movieData: Readonly<Buffer> | null) {
		if (this._isOpen) {
			throw new Error('Already open');
		}

		this._closeCallbacks = [];
		await this._openData(player, movieData);

		this._isOpen = true;
	}

	/**
	 * Close output.
	 */
	public async close() {
		this._assertIsOpen();

		try {
			await this._close();
		}
		finally {
			this._closeCallbacks = [];
		}

		this._isOpen = false;
	}

	/**
	 * Write out projector with player and file.
	 * Has a callback to write out the resources.
	 *
	 * @param player Player path.
	 * @param movieFile Movie file.
	 * @param func Async function.
	 * @returns Return value of the async function.
	 */
	public async withFile<T>(
		player: string,
		movieFile: string | null,
		func: ((self: this) => Promise<T>) | null = null
	) {
		const movieData = movieFile ? await fse.readFile(movieFile) : null;
		return this.withData(player, movieData, func);
	}

	/**
	 * Write out projector with player and data.
	 * Has a callback to write out the resources.
	 *
	 * @param player Player path.
	 * @param movieData Movie data.
	 * @param func Async function.
	 * @returns Return value of the async function.
	 */
	public async withData<T>(
		player: string,
		movieData: Readonly<Buffer> | null,
		func: ((self: this) => Promise<T>) | null = null
	) {
		await this.openData(player, movieData);
		try {
			return func ? await func.call(this, this) : null;
		}
		finally {
			await this.close();
		}
	}

	/**
	 * Check if path for resource exists.
	 *
	 * @param destination Resource destination.
	 * @returns True if destination exists, else false.
	 */
	public async resourceExists(destination: string) {
		return !!fsLstatExists(this.resourcePath(destination));
	}

	/**
	 * Copy resource, detecting source type automatically.
	 *
	 * @param destination Resource destination.
	 * @param source Source directory.
	 * @param options Resource options.
	 */
	public async copyResource(
		destination: string,
		source: string,
		options: Readonly<IBundleResourceOptions> | null = null
	) {
		this._assertIsOpen();

		const stat = await fse.lstat(source);
		switch (true) {
			case stat.isSymbolicLink(): {
				await this.copyResourceSymlink(destination, source, options);
				break;
			}
			case stat.isFile(): {
				await this.copyResourceFile(destination, source, options);
				break;
			}
			case stat.isDirectory(): {
				await this.copyResourceDirectory(destination, source, options);
				break;
			}
			default: {
				throw new Error(`Unsupported resource type: ${source}`);
			}
		}
	}

	/**
	 * Copy directory as resource, recursive copy.
	 *
	 * @param destination Resource destination.
	 * @param source Source directory.
	 * @param options Resource options.
	 */
	public async copyResourceDirectory(
		destination: string,
		source: string,
		options: Readonly<IBundleResourceOptions> | null = null
	) {
		this._assertIsOpen();

		// Create directory.
		await this.createResourceDirectory(
			destination,
			options ? await this._expandResourceOptionsCopy(
				options,
				async () => fse.stat(source)
			) : options
		);

		// If not recursive do not walk contents.
		if (options && options.noRecurse) {
			return;
		}

		// Any directories we add should not be recursive.
		const opts = {
			...(options || {}),
			noRecurse: true
		};
		await fsWalk(source, async (path, stat) => {
			// If this name is excluded, skip without descending.
			if (this.isExcludedFile(basename(path))) {
				return false;
			}

			await this.copyResource(
				pathJoin(destination, path),
				pathJoin(source, path),
				opts
			);
			return true;
		});
	}

	/**
	 * Copy file as resource.
	 *
	 * @param destination Resource destination.
	 * @param source Source file.
	 * @param options Resource options.
	 */
	public async copyResourceFile(
		destination: string,
		source: string,
		options: Readonly<IBundleResourceOptions> | null = null
	) {
		this._assertIsOpen();

		await this.streamResourceFile(
			destination,
			fse.createReadStream(source),
			options ? await this._expandResourceOptionsCopy(
				options,
				async () => fse.stat(source)
			) : options
		);
	}

	/**
	 * Copy symlink as resource.
	 *
	 * @param destination Resource destination.
	 * @param source Source symlink.
	 * @param options Resource options.
	 */
	public async copyResourceSymlink(
		destination: string,
		source: string,
		options: Readonly<IBundleResourceOptions> | null = null
	) {
		this._assertIsOpen();

		await this.createResourceSymlink(
			destination,
			await fse.readlink(source),
			options ? await this._expandResourceOptionsCopy(
				options,
				async () => fse.lstat(source)
			) : options
		);
	}

	/**
	 * Create a resource directory.
	 *
	 * @param destination Resource destination.
	 * @param options Resource options.
	 */
	public async createResourceDirectory(
		destination: string,
		options: Readonly<IBundleResourceOptions> | null = null
	) {
		this._assertIsOpen();

		const dest = await this._assertNotResourceExists(
			destination,
			!!(options && options.merge)
		);
		await fse.ensureDir(dest);

		// If either is set, queue up change times when closing.
		if (options && (options.atime || options.mtime)) {
			// Get absolute path, use length for the priority.
			// Also copy the options object which the owner could change.
			const abs = resolve(dest);
			this._queueCloseCallback(
				abs.length,
				this._setResourceAttributes.bind(this, abs, {...options})
			);
		}
	}

	/**
	 * Create a resource file.
	 *
	 * @param destination Resource destination.
	 * @param data Resource data.
	 * @param options Resource options.
	 */
	public async createResourceFile(
		destination: string,
		data: Readonly<Buffer> | string,
		options: Readonly<IBundleResourceOptions> | null = null
	) {
		this._assertIsOpen();

		await this.streamResourceFile(destination, new Readable({
			read() {
				this.push(data);
				this.push(null);
			}
		}), options);
	}

	/**
	 * Create a resource symlink.
	 *
	 * @param destination Resource destination.
	 * @param target Symlink target.
	 * @param options Resource options.
	 */
	public async createResourceSymlink(
		destination: string,
		target: Readonly<Buffer> | string,
		options: Readonly<IBundleResourceOptions> | null = null
	) {
		this._assertIsOpen();

		const dest = await this._assertNotResourceExists(destination);
		await fse.ensureDir(dirname(dest));
		await fse.symlink(target as (string | Buffer), dest);

		if (options) {
			await this._setResourceAttributes(dest, options);
		}
	}

	/**
	 * Stream readable source to resource file.
	 *
	 * @param destination Resource destination.
	 * @param data Resource stream.
	 * @param options Resource options.
	 */
	public async streamResourceFile(
		destination: string,
		data: Readable,
		options: Readonly<IBundleResourceOptions> | null = null
	) {
		this._assertIsOpen();

		const dest = await this._assertNotResourceExists(destination);
		await fse.ensureDir(dirname(dest));
		await pipelineP(data, fse.createWriteStream(dest));

		if (options) {
			await this._setResourceAttributes(dest, options);
		}
	}

	/**
	 * Expand resource options copy properties with stat object from source.
	 *
	 * @param options Options object.
	 * @param stat Stat function.
	 * @returns Options copy with any values populated.
	 */
	protected async _expandResourceOptionsCopy(
		options: Readonly<IBundleResourceOptions>,
		stat: (() => Promise<{
			atime: Date;
			mtime: Date;
			mode: number;
		}>)
	) {
		const r = {...options} as IBundleResourceOptions;
		const st = once(stat);
		if (!r.atime && r.atimeCopy) {
			r.atime = (await st()).atime;
		}
		if (!r.mtime && r.mtimeCopy) {
			r.mtime = (await st()).mtime;
		}
		if (typeof r.executable !== 'boolean' && r.executableCopy) {
			r.executable = this._getResourceModeExecutable((await st()).mode);
		}
		return r;
	}

	/**
	 * Set resource attributes from options object.
	 *
	 * @param path File path.
	 * @param options Options object.
	 */
	protected async _setResourceAttributes(
		path: string,
		options: Readonly<IBundleResourceOptions>
	) {
		const {atime, mtime, executable} = options;
		const st = await fse.lstat(path);

		// Maybe set executable if not a directory and supported.
		if (typeof executable === 'boolean' && !st.isDirectory()) {
			if (!st.isSymbolicLink()) {
				await fse.chmod(path, this._setResourceModeExecutable(
					st.mode,
					executable
				));
			}
			else if (fsLchmodSupported) {
				await fsLchmod(path, this._setResourceModeExecutable(
					// Workaround for a legacy Node issue.
					// eslint-disable-next-line no-bitwise
					st.mode & 0b111111111,
					executable
				));
			}
		}

		// Maybe change times if either is set and supported.
		if (atime || mtime) {
			if (!st.isSymbolicLink()) {
				await fse.utimes(path, atime || st.atime, mtime || st.mtime);
			}
			else if (fsLutimesSupported) {
				await fsLutimes(path, atime || st.atime, mtime || st.mtime);
			}
		}
	}

	/**
	 * Get file mode executable.
	 *
	 * @param mode Current mode.
	 * @returns Is executable.
	 */
	protected _getResourceModeExecutable(mode: number) {
		// eslint-disable-next-line no-bitwise
		return !!(mode & userExec);
	}

	/**
	 * Set file mode executable.
	 *
	 * @param mode Current mode.
	 * @param executable Is executable.
	 * @returns File mode.
	 */
	protected _setResourceModeExecutable(mode: number, executable: boolean) {
		// eslint-disable-next-line no-bitwise
		return (executable ? (mode | userExec) : (mode & ~userExec)) >>> 0;
	}

	/**
	 * Open output with data.
	 *
	 * @param player Player path.
	 * @param movieData Movie data.
	 */
	protected async _openData(
		player: string,
		movieData: Readonly<Buffer> | null
	) {
		await this.projector.withData(player, movieData);
	}

	/**
	 * Close output.
	 */
	protected async _close() {
		await this._writeLauncher();

		const closeCallbacks = this._closeCallbacks;
		for (let i = closeCallbacks.length; i--;) {
			for (const func of (closeCallbacks[i] || [])) {
				// eslint-disable-next-line no-await-in-loop
				await func();
			}
		}
	}

	/**
	 * Assert bundle is open.
	 */
	protected _assertIsOpen() {
		if (!this._isOpen) {
			throw new Error('Not open');
		}
	}

	/**
	 * Assert resource does not exist, returning destination path.
	 *
	 * @param destination Resource destination.
	 * @param ignoreDirectory Ignore directories.
	 * @returns Destination path.
	 */
	protected async _assertNotResourceExists(
		destination: string,
		ignoreDirectory = false
	) {
		const dest = this.resourcePath(destination);
		const st = await fsLstatExists(dest);
		if (st && (!ignoreDirectory || !st.isDirectory())) {
			throw new Error(`Resource path exists: ${dest}`);
		}
		return dest;
	}

	/**
	 * Queue close callback function in a priority queue.
	 *
	 * @param priority Priority, a positive integer, higher to run sooner.
	 * @param func Callback function.
	 */
	protected _queueCloseCallback(priority: number, func: () => Promise<any>) {
		const queue = this._closeCallbacks;
		(queue[priority] || (queue[priority] = [])).push(func);
	}

	/**
	 * Main application file extension.
	 *
	 * @returns File extension.
	 */
	public abstract get extension(): string;

	/**
	 * Get path for resource.
	 *
	 * @param destination Resource destination.
	 * @returns Destination path.
	 */
	public abstract resourcePath(destination: string): string;

	/**
	 * Create projector instance for the bundle.
	 *
	 * @returns Projector instance.
	 */
	protected abstract _createProjector(): Projector;

	/**
	 * Write the launcher file.
	 */
	protected abstract async _writeLauncher(): Promise<void>;
}

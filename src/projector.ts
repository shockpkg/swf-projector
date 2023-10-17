/**
 * Projector object.
 */
export abstract class Projector {
	/**
	 * Set the nobrowse option on mounted disk images.
	 */
	public nobrowse = false;

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
	 * Write out the projector.
	 */
	public abstract write(): Promise<void>;
}

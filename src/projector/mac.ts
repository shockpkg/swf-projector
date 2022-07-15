import {Projector} from '../projector';

/**
 * ProjectorMac object.
 */
export abstract class ProjectorMac extends Projector {
	/**
	 * ProjectorMac constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}
}

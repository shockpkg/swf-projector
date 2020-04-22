import {
	Projector
} from '../projector';

/**
 * ProjectorWindows constructor.
 *
 * @param path Output path.
 */
export abstract class ProjectorWindows extends Projector {
	constructor(path: string) {
		super(path);
	}
}

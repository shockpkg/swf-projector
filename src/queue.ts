/**
 * A simple queue with optional priority.
 */
export class Queue extends Object {
	/**
	 * Queue data.
	 */
	private __queue: {
		priority: number;
		handler: () => Promise<any>;
	}[] = [];

	constructor() {
		super();
	}

	/**
	 * Get size of queue.
	 *
	 * @returns Total callbacks in queue.
	 */
	public get size() {
		return this.__queue.length;
	}

	/**
	 * Clear queue.
	 */
	public clear() {
		this.__queue = [];
	}

	/**
	 * Enqueue callback.
	 *
	 * @param handler Callback function.
	 * @param priority Callback priority.
	 */
	public push(handler: () => Promise<any>, priority = 0) {
		const queue = this.__queue;
		let index = 0;
		for (let i = queue.length; i--;) {
			if (queue[i].priority < priority) {
				index = i + 1;
				break;
			}
		}
		queue.splice(index, 0, {
			priority,
			handler
		});
	}

	/**
	 * Pop callback off queue.
	 *
	 * @returns Callback function or null if empty.
	 */
	public pop() {
		const entry = this.__queue.pop();
		return entry ? entry.handler : null;
	}

	/**
	 * Shift callback off queue.
	 *
	 * @returns Callback function or null if empty.
	 */
	public shift() {
		const entry = this.__queue.shift();
		return entry ? entry.handler : null;
	}

	/**
	 * Run queue.
	 */
	public async run() {
		for (;;) {
			const entry = this.pop();
			if (!entry) {
				break;
			}

			// eslint-disable-next-line no-await-in-loop
			await entry();
		}
	}
}

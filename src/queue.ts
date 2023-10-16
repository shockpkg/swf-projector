/**
 * A simple queue with optional priority.
 */
export class Queue {
	/**
	 * Queue data.
	 */
	private _queue_: {
		priority: number;
		handler: () => Promise<unknown>;
	}[] = [];

	/**
	 * Queue constructor.
	 */
	constructor() {}

	/**
	 * Get size of queue.
	 *
	 * @returns Total callbacks in queue.
	 */
	public get size() {
		return this._queue_.length;
	}

	/**
	 * Clear queue.
	 */
	public clear() {
		this._queue_ = [];
	}

	/**
	 * Enqueue callback.
	 *
	 * @param handler Callback function.
	 * @param priority Callback priority.
	 */
	public push(handler: () => Promise<unknown>, priority = 0) {
		const queue = this._queue_;
		let index = 0;
		for (let i = queue.length; i--; ) {
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
		const entry = this._queue_.pop();
		return entry ? entry.handler : null;
	}

	/**
	 * Shift callback off queue.
	 *
	 * @returns Callback function or null if empty.
	 */
	public shift() {
		const entry = this._queue_.shift();
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

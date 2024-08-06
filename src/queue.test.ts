/* eslint-disable unicorn/no-array-push-push */
import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';

import {Queue} from './queue';

void describe('queue', () => {
	void describe('Queue', () => {
		void it('priority: 0', async () => {
			const order: string[] = [];
			const q = new Queue();

			q.push(async () => {
				order.push('a');
			});
			q.push(async () => {
				order.push('b');
			});
			q.push(async () => {
				order.push('c');
			});
			q.push(async () => {
				order.push('d');
			});
			q.push(async () => {
				order.push('e');
			});
			q.push(async () => {
				order.push('f');
			});

			await q.run();

			strictEqual(order.join(','), 'a,b,c,d,e,f');
		});

		void it('priority: incremental', async () => {
			const order: string[] = [];
			const q = new Queue();

			q.push(async () => {
				order.push('f');
			}, 1);
			q.push(async () => {
				order.push('e');
			}, 2);
			q.push(async () => {
				order.push('d');
			}, 3);
			q.push(async () => {
				order.push('c');
			}, 4);
			q.push(async () => {
				order.push('b');
			}, 5);
			q.push(async () => {
				order.push('a');
			}, 6);

			await q.run();

			strictEqual(order.join(','), 'a,b,c,d,e,f');
		});

		void it('priority: decremental', async () => {
			const order: string[] = [];
			const q = new Queue();

			q.push(async () => {
				order.push('a');
			}, 6);
			q.push(async () => {
				order.push('b');
			}, 5);
			q.push(async () => {
				order.push('c');
			}, 4);
			q.push(async () => {
				order.push('d');
			}, 3);
			q.push(async () => {
				order.push('e');
			}, 2);
			q.push(async () => {
				order.push('f');
			}, 1);

			await q.run();

			strictEqual(order.join(','), 'a,b,c,d,e,f');
		});

		void it('priority: mixed', async () => {
			const order: string[] = [];
			const q = new Queue();

			q.push(async () => {
				order.push('d');
			}, 0);
			q.push(async () => {
				order.push('a');
			}, 2);
			q.push(async () => {
				order.push('f');
			}, -1);
			q.push(async () => {
				order.push('b');
			}, 2);
			q.push(async () => {
				order.push('c');
			}, 1);
			q.push(async () => {
				order.push('e');
			}, 0);

			await q.run();

			strictEqual(order.join(','), 'a,b,c,d,e,f');
		});
	});
});

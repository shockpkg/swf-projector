/* eslint-disable @typescript-eslint/require-await */
import {Queue} from './queue';

describe('queue', () => {
	describe('Queue', () => {
		it('priority: 0', async () => {
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

			expect(order.join(',')).toBe('a,b,c,d,e,f');
		});

		it('priority: incremental', async () => {
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

			expect(order.join(',')).toBe('a,b,c,d,e,f');
		});

		it('priority: decremental', async () => {
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

			expect(order.join(',')).toBe('a,b,c,d,e,f');
		});

		it('priority: mixed', async () => {
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

			expect(order.join(',')).toBe('a,b,c,d,e,f');
		});
	});
});

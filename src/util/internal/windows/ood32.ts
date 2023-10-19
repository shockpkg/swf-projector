import {OOD_I386} from './asm';

export const ood32 = [
	// 30.0.0.113
	[
		{
			count: 1,
			find: OOD_I386['30'],
			replace: OOD_I386['ret4']
		}
	],
	// 31.0.0.108
	[
		{
			count: 1,
			find: OOD_I386['31'],
			replace: OOD_I386['ret4']
		}
	]
];

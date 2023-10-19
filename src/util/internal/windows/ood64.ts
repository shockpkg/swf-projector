import {once} from '../data';

import {OOD_X8664} from './asm';

export const ood64 = once(() => [
	// 26.0.0.137, 32.0.0.270
	[
		{
			count: 1,
			find: OOD_X8664['26'],
			replace: OOD_X8664['ret']
		}
	],
	// 30.0.0.134
	[
		{
			count: 1,
			find: OOD_X8664['30'],
			replace: OOD_X8664['ret']
		}
	]
]);

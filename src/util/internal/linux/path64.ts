import {once} from '../../../util';
import {patchHexToBytes} from '../patch';

// Essentially search for the reference to "file:" that we need to replace.
// Checking the offset in the bytes actually points there is also necessary.
export const pathPatches64 = once(() => [
	{
		find: patchHexToBytes(
			[
				// mov     r12, rsi
				'49 89 F4',
				// lea     rsi, [rip + -- -- -- --]
				'48 8D 35 -- -- -- --'
			].join(' ')
		),
		offset: 6
	}
]);

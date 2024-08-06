import {describe, it} from 'node:test';
import {strictEqual} from 'node:assert';

import {loader} from './loader.ts';

function hex(buffer: Uint8Array) {
	return [...buffer]
		.map(b => b.toString(16).padStart(2, '0').toUpperCase())
		.join(' ');
}

const swf4 = [
	// Magic 'SWF'
	'46 57 53',
	// Version
	'04',
	// Size
	'39 00 00 00',
	// Frame size
	'78 00 05 DC 00 00 0F A0 00',
	// Frame rate
	'00 1E',
	// Frame count
	'01 00',
	// SetBackgroundColor
	'43 02 33 66 99',
	// DoAction
	'19 03',
	// > push 'other.swf'
	'96 0B 00 00 6F 74 68 65 72 2E 73 77 66 00',
	// > push '/'
	'96 03 00 00 2F 00',
	// > loadMovie
	'9A 01 00 40',
	// > end
	'00',
	// ShowFrame
	'40 00',
	// End
	'00 00'
].join(' ');

const swf5 = [
	// Magic 'SWF'
	'46 57 53',
	// Version
	'05',
	// Size
	'43 00 00 00',
	// Frame size
	'78 00 05 DC 00 00 0F A0 00',
	// Frame rate
	'00 1E',
	// Frame count
	'01 00',
	// SetBackgroundColor
	'43 02 33 66 99',
	// DoAction
	'23 03',
	// > constants 'other.swf', '_level0'
	'88 14 00 02 00 6F 74 68 65 72 2E 73 77 66 00 5F 6C 65 76 65 6C 30 00',
	// > push c:0, c:1
	'96 04 00 08 00 08 01',
	// > loadMovie
	'9A 01 00 40',
	// > end
	'00',
	// ShowFrame
	'40 00',
	// End
	'00 00'
].join(' ');

const swf5Complex = [
	// Magic 'SWF'
	'46 57 53',
	// Version
	'05',
	// Size
	'47 00 00 00',
	// Frame size
	'78 00 05 DD 40 00 0F A5 00',
	// Frame rate
	'80 1E',
	// Frame count
	'03 00',
	// SetBackgroundColor
	'43 02 33 66 99',
	// ShowFrame
	'40 00',
	// ShowFrame
	'40 00',
	// DoAction
	'23 03',
	// > constants 'other.swf', '_level0'
	'88 14 00 02 00 6F 74 68 65 72 2E 73 77 66 00 5F 6C 65 76 65 6C 30 00',
	// > push c:0, c:1
	'96 04 00 08 00 08 01',
	// > loadMovie
	'9A 01 00 40',
	// > end
	'00',
	// ShowFrame
	'40 00',
	// End
	'00 00'
].join(' ');

void describe('loader', () => {
	void describe('loader', () => {
		void it('swfv: 4', () => {
			strictEqual(
				hex(loader(4, 600, 400, 30, 0x336699, 'other.swf')),
				swf4
			);
		});

		void it('swfv: 5', () => {
			strictEqual(
				hex(loader(5, 600, 400, 30, 0x336699, 'other.swf')),
				swf5
			);
		});

		void it('swfv: 5 complex', () => {
			strictEqual(
				hex(loader(5, 600.5, 400.5, 30.5, 0x336699, 'other.swf', 2)),
				swf5Complex
			);
		});
	});
});

import {
	machoTypesData
} from './mac';

const unhex = (hex: string) => Buffer.from(hex.replace(/\s/g, ''), 'hex');

const machoTypes = [
	{
		name: 'slim: ppc',
		data: unhex('FE ED FA CE 00 00 00 12 00 00 00 0A'),
		format: {
			cpuType: 0x00000012,
			cpuSubtype: 10
		}
	},
	{
		name: 'slim: ppc970',
		data: unhex('FE ED FA CE 00 00 00 12 00 00 00 64'),
		format: {
			cpuType: 0x00000012,
			cpuSubtype: 100
		}
	},
	{
		name: 'slim: ppc64',
		data: unhex('FE ED FA CF 01 00 00 12 00 00 00 00'),
		format: {
			cpuType: 0x01000012,
			cpuSubtype: 0
		}
	},
	{
		name: 'slim: i386',
		data: unhex('CE FA ED FE 07 00 00 00 03 00 00 00'),
		format: {
			cpuType: 0x00000007,
			cpuSubtype: 3
		}
	},
	{
		name: 'slim: x86_64',
		data: unhex('CF FA ED FE 07 00 00 01 03 00 00 00'),
		format: {
			cpuType: 0x01000007,
			cpuSubtype: 3
		}
	},
	{
		name: 'fat',
		data: unhex([
			'CA FE BA BE 00 00 00 05',
			'00 00 00 12 00 00 00 0A 00 00 00 00 00 00 00 00 00 00 00 0C',
			'00 00 00 12 00 00 00 64 00 00 00 00 00 00 00 00 00 00 00 0C',
			'01 00 00 12 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 0C',
			'00 00 00 07 00 00 00 03 00 00 00 00 00 00 00 00 00 00 00 0C',
			'01 00 00 07 00 00 00 03 00 00 00 00 00 00 00 00 00 00 00 0C'
		].join('')),
		format: [
			{
				cpuType: 0x00000012,
				cpuSubtype: 10
			},
			{
				cpuType: 0x00000012,
				cpuSubtype: 100
			},
			{
				cpuType: 0x01000012,
				cpuSubtype: 0
			},
			{
				cpuType: 0x00000007,
				cpuSubtype: 3
			},
			{
				cpuType: 0x01000007,
				cpuSubtype: 3
			}
		]
	}
];

describe('util/mac', () => {
	describe('machoTypesData', () => {
		for (const {name, data, format} of machoTypes) {
			it(name, () => {
				expect(machoTypesData(data)).toEqual(format);
			});
		}
	});
});

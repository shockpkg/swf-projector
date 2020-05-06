import crypto from 'crypto';

import {
	machoAppLauncher,
	machoTypesData
} from './mac';

const unhex = (hex: string) => Buffer.from(hex.replace(/\s/g, ''), 'hex');

function sha256(data: Buffer) {
	return crypto
		.createHash('sha256')
		.update(data)
		.digest('hex')
		.toLowerCase();
}

const machoTypes = [
	{
		name: 'slim: ppc',
		data: unhex('FE ED FA CE 00 00 00 12 00 00 00 0A'),
		format: {
			cpuType: 0x00000012,
			cpuSubtype: 10
		},
		launcher:
			'17414c123fe82ac74a89fad9c80e36d8b612ded5a520e35f3c33eabe75a023a7'
	},
	{
		name: 'slim: ppc64',
		data: unhex('FE ED FA CF 01 00 00 12 80 00 00 00'),
		format: {
			cpuType: 0x01000012,
			cpuSubtype: 0x80000000
		},
		launcher:
			'9e159161fc21b72de6fddb5fb9c60c0e34e649e4660248778219e58198adfb3d'
	},
	{
		name: 'slim: i386',
		data: unhex('CE FA ED FE 07 00 00 00 03 00 00 00'),
		format: {
			cpuType: 0x00000007,
			cpuSubtype: 3
		},
		launcher:
			'e52e19fce336130824dcfd4731bf85db7e8e96628ef8c6a49769dc5247ef6ed0'
	},
	{
		name: 'slim: x86_64',
		data: unhex('CF FA ED FE 07 00 00 01 03 00 00 80'),
		format: {
			cpuType: 0x01000007,
			cpuSubtype: 0x80000003
		},
		launcher:
			'f5b7625da819324f442cea1f3af83ea4b2bf0af1d185a7747d81b698a6168562'
	},
	{
		name: 'fat: ppc, ppc64, i386, x86_64',
		data: unhex([
			'CA FE BA BE 00 00 00 04',
			'00 00 00 12 00 00 00 0A 00 00 00 00 00 00 00 00 00 00 00 00',
			'01 00 00 12 80 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00',
			'00 00 00 07 00 00 00 03 00 00 00 00 00 00 00 00 00 00 00 00',
			'01 00 00 07 80 00 00 03 00 00 00 00 00 00 00 00 00 00 00 00'
		].join('')),
		format: [
			{
				cpuType: 0x00000012,
				cpuSubtype: 10
			},
			{
				cpuType: 0x01000012,
				cpuSubtype: 0x80000000
			},
			{
				cpuType: 0x00000007,
				cpuSubtype: 3
			},
			{
				cpuType: 0x01000007,
				cpuSubtype: 0x80000003
			}
		],
		launcher:
			'4646bb12e944d4cc2e1b2649b5b33112237a69e01d1aa30d64994135b7969b1d'
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

	describe('machoAppLauncher', () => {
		for (const {name, format, launcher} of machoTypes) {
			it(name, async () => {
				const data = await machoAppLauncher(format);
				expect(machoTypesData(data)).toEqual(format);
				expect(sha256(data)).toBe(launcher);
			});
		}
	});
});

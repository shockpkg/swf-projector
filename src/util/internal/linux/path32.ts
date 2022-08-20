import {once} from '../../../util';
import {patchHexToBytes} from '../patch';

/**
 * Common absolute string reference replace code.
 *
 * @param at Where in the match the offset integer is.
 * @returns Function that preforms patching testing and optionally applying.
 */
function pathPatcherAbs(at: number) {
	return (
		data: Buffer,
		off: number,
		src: number[],
		dst: number,
		mod: boolean
	) => {
		const valueAt = off + at;
		const base = data.readInt32LE(0x7c);
		const rel = data.readInt32LE(valueAt);
		const abs = rel - base;
		if (!src.includes(abs)) {
			return false;
		}
		if (!mod) {
			return true;
		}
		const diff = dst - abs;
		const relFixed = rel + diff;
		data.writeInt32LE(relFixed, valueAt);
		return true;
	};
}

/**
 * Common relative string reference replace code.
 *
 * @param atBase Where in the match the base is calculated.
 * @param atValue Where in the match the offset integer is.
 * @returns Function that preforms patching testing and optionally applying.
 */
function pathPatcherRel(atBase: number, atValue: number) {
	return (
		data: Buffer,
		off: number,
		src: number[],
		dst: number,
		mod: boolean
	) => {
		const valueAt = off + atValue;
		const ebx = off + atBase + 5 + data.readInt32LE(off + 7);
		const rel = data.readInt32LE(valueAt);
		const abs = ebx + rel;
		if (!src.includes(abs)) {
			return false;
		}
		if (!mod) {
			return true;
		}
		const diff = dst - abs;
		const relFixed = rel + diff;
		data.writeInt32LE(relFixed, valueAt);
		return true;
	};
}

// Essentially search for the reference to "file:" that we need to replace.
// Checking the offset in the bytes actually points there is also necessary.
export const pathPatches32 = once(() => [
	// 9.0.115.0
	{
		find: patchHexToBytes(
			[
				// je      ...
				'0F 84 -- -- -- --',
				// lea     ebx, [ebp-0x18]
				'8D 5D E8',
				// mov     esi, ...
				'BE -- -- -- --',
				// mov     DWORD PTR [esp+0x4], esi
				'89 74 24 04',
				// mov     DWORD PTR [esp], ebx
				'89 1C 24',
				// call    ...
				'E8 -- -- -- --'
			].join(' ')
		),
		patch: pathPatcherAbs(10)
	},
	// 10.0.12.36
	{
		find: patchHexToBytes(
			[
				// je      ...
				'0F 84 -- -- -- --',
				// lea     ebx, [ebp-0x1020]
				'8D 9D E0 EF FF FF',
				// mov     DWORD PTR [esp+0x4], ...
				'C7 44 24 04 -- -- -- --',
				// mov     DWORD PTR [esp], ebx
				'89 1C 24',
				// call    ...
				'E8 -- -- -- --'
			].join(' ')
		),
		patch: pathPatcherAbs(16)
	},
	// 10.1.53.64
	{
		find: patchHexToBytes(
			[
				// je      ...
				'0F 84 -- -- -- --',
				// lea     eax, [ebp-0x1C]
				'8D 45 E4',
				// mov     DWORD PTR [esp], eax
				'89 04 24',
				// mov     DWORD PTR [esp+0x4], ...
				'C7 44 24 04 -- -- -- --',
				// call    ...
				'E8 -- -- -- --',
				// mov     edx, DWORD PTR [ebp+0x8]
				'8B 55 08'
			].join(' ')
		),
		patch: pathPatcherAbs(16)
	},
	// 11.0.1.152
	{
		find: patchHexToBytes(
			[
				// je      ...
				'0F 84 -- -- -- --',
				// lea     eax, [ebp-0x1C]
				'8D 45 E4',
				// xor     ebx, ebx
				'31 DB',
				// mov     DWORD PTR [esp], eax
				'89 04 24',
				// mov     DWORD PTR [esp+0x4], ...
				'C7 44 24 04 -- -- -- --',
				// call    ...
				'E8 -- -- -- --'
			].join(' ')
		),
		patch: pathPatcherAbs(18)
	},
	// 11.2.202.228
	{
		find: patchHexToBytes(
			[
				// call    ...
				'E8 -- -- -- --',
				// add     ebx, 0x0
				'81 C3 -- -- -- --',
				// test    ..., ...
				'85 --',
				// je      ...
				'0F 84 -- -- -- --',
				// lea     eax, [ebx+0x0]
				'8D 83 -- -- -- --',
				// xor     esi, esi
				'31 F6',
				// mov     DWORD PTR [esp+0x4], eax
				'89 44 24 04'
			].join(' ')
		),
		patch: pathPatcherRel(0, 21)
	}
]);

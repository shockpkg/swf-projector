import {NtExecutable} from 'resedit';

import {align} from '../../../util';

import {
	IDD_BASE_RELOCATION,
	IMAGE_SCN_CNT_CODE,
	IMAGE_SCN_CNT_INITIALIZED_DATA,
	IMAGE_SCN_CNT_UNINITIALIZED_DATA
} from './constants';

/**
 * Get the EXE section that includes an address.
 *
 * @param exe NtExecutable instance.
 * @param address The address.
 * @returns The section or null if section not found.
 */
export function exeSectionByAddress(exe: NtExecutable, address: number) {
	for (const {info, data} of exe.getAllSections()) {
		const {virtualAddress, virtualSize} = info;
		if (
			address >= virtualAddress &&
			address < virtualAddress + virtualSize
		) {
			return {
				info,
				data
			};
		}
	}
	return null;
}

/**
 * Get the EXE code section.
 *
 * @param exe NtExecutable instance.
 * @returns The section.
 */
export function exeCodeSection(exe: NtExecutable) {
	const s = exeSectionByAddress(exe, exe.newHeader.optionalHeader.baseOfCode);
	if (!s || !s.data) {
		throw new Error(`Invalid PE code section`);
	}
	return {
		info: s.info,
		data: s.data
	};
}

/**
 * Assert the given section is last section.
 *
 * @param exe NtExecutable instance.
 * @param index ImageDirectory index.
 * @param name Friendly name for messages.
 */
export function exeAssertLastSection(
	exe: NtExecutable,
	index: number,
	name: string
) {
	const section = exe.getSectionByEntry(index);
	if (!section) {
		throw new Error(`Missing section: ${index}:${name}`);
	}
	const allSections = exe.getAllSections();
	let last = allSections[0].info;
	for (const {info} of allSections) {
		if (info.pointerToRawData > last.pointerToRawData) {
			last = info;
		}
	}
	const {info} = section;
	if (info.pointerToRawData < last.pointerToRawData) {
		throw new Error(`Not the last section: ${index}:${name}`);
	}
}

/**
 * Removes the reloc section if exists, fails if not the last section.
 *
 * @param exe NtExecutable instance.
 * @returns Restore function.
 */
export function exeRemoveReloc(exe: NtExecutable) {
	const section = exe.getSectionByEntry(IDD_BASE_RELOCATION);
	if (!section) {
		return () => {};
	}
	const {size} =
		exe.newHeader.optionalHeaderDataDirectory.get(IDD_BASE_RELOCATION);
	exeAssertLastSection(exe, IDD_BASE_RELOCATION, '.reloc');
	exe.setSectionByEntry(IDD_BASE_RELOCATION, null);
	return () => {
		exe.setSectionByEntry(IDD_BASE_RELOCATION, section);
		const {virtualAddress} =
			exe.newHeader.optionalHeaderDataDirectory.get(IDD_BASE_RELOCATION);
		exe.newHeader.optionalHeaderDataDirectory.set(IDD_BASE_RELOCATION, {
			virtualAddress,
			size
		});
	};
}

/**
 * Update the sizes in EXE headers.
 *
 * @param exe NtExecutable instance.
 */
export function exeUpdateSizes(exe: NtExecutable) {
	const {optionalHeader} = exe.newHeader;
	const {fileAlignment} = optionalHeader;
	let sizeOfCode = 0;
	let sizeOfInitializedData = 0;
	let sizeOfUninitializedData = 0;
	for (const {
		info: {characteristics, sizeOfRawData, virtualSize}
	} of exe.getAllSections()) {
		// eslint-disable-next-line no-bitwise
		if (characteristics & IMAGE_SCN_CNT_CODE) {
			sizeOfCode += sizeOfRawData;
		}
		// eslint-disable-next-line no-bitwise
		if (characteristics & IMAGE_SCN_CNT_INITIALIZED_DATA) {
			sizeOfInitializedData += Math.max(
				sizeOfRawData,
				align(virtualSize, fileAlignment)
			);
		}
		// eslint-disable-next-line no-bitwise
		if (characteristics & IMAGE_SCN_CNT_UNINITIALIZED_DATA) {
			sizeOfUninitializedData += align(virtualSize, fileAlignment);
		}
	}
	optionalHeader.sizeOfCode = sizeOfCode;
	optionalHeader.sizeOfInitializedData = sizeOfInitializedData;
	optionalHeader.sizeOfUninitializedData = sizeOfUninitializedData;
}

import {
	join as pathJoin
} from 'path';

import {
	Plist,
	Value,
	ValueDict,
	ValueString
} from '@shockpkg/plist-dom';
import {
	unsign
} from 'macho-unsign';
import fse from 'fs-extra';

const FAT_MAGIC = 0xCAFEBABE;
const MH_MAGIC = 0xFEEDFACE;
const MH_CIGAM = 0xCEFAEDFE;
const MH_MAGIC_64 = 0xFEEDFACF;
const MH_CIGAM_64 = 0xCFFAEDFE;

export interface IMachoType {

	/**
	 * CPU type.
	 */
	cpuType: number;

	/**
	 * CPU subtype.
	 */
	cpuSubtype: number;
}

/**
 * Parse plist data.
 * Currently only supports XML plist.
 *
 * @param data Plist XML.
 * @returns Plist document.
 */
export async function plistParse(data: string) {
	const plist = new Plist();
	plist.fromXml(data);
	return plist;
}

/**
 * Read plist file.
 * Currently only supports XML plist.
 *
 * @param path Plist file.
 * @returns Plist document.
 */
export async function plistRead(path: string) {
	return plistParse(await fse.readFile(path, 'utf8'));
}

/**
 * Get Info.plist dictionary or throw.
 *
 * @param plist Plist document.
 * @returns Dictionary object.
 */
export function infoPlistDict(plist: Plist) {
	return plist.getValue().castAs(ValueDict);
}

/**
 * Get Info.plist dictionary value or throw.
 *
 * @param plist Plist document.
 * @param key Dictionary key.
 * @returns Value object.
 */
export function infoPlistDictGetValue(plist: Plist, key: string) {
	return infoPlistDict(plist).getValue(key);
}

/**
 * Set Info.plist dictionary value or throw.
 *
 * @param plist Plist document.
 * @param key Dictionary key.
 * @param value Value object.
 */
export function infoPlistDictSet(
	plist: Plist,
	key: string,
	value: Value | null
) {
	const dict = infoPlistDict(plist);
	if (value) {
		dict.set(key, value);
	}
	else {
		dict.delete(key);
	}
}

/**
 * Get Info.plist bundle executable.
 *
 * @param plist Plist document.
 * @returns Executable name.
 */
export function infoPlistBundleExecutableGet(plist: Plist) {
	return infoPlistDictGetValue(plist, 'CFBundleExecutable')
		.castAs(ValueString).value;
}

/**
 * Set Info.plist bundle executable.
 *
 * @param plist Plist document.
 * @param value Executable name.
 */
export function infoPlistBundleExecutableSet(
	plist: Plist,
	value: string | null
) {
	const v = value === null ? null : new ValueString(value);
	infoPlistDictSet(plist, 'CFBundleExecutable', v);
}

/**
 * Get Info.plist bundle icon.
 *
 * @param plist Plist document.
 * @returns Icon name.
 */
export function infoPlistBundleIconFileGet(plist: Plist) {
	return infoPlistDictGetValue(plist, 'CFBundleIconFile')
		.castAs(ValueString).value;
}

/**
 * Set Info.plist bundle icon.
 *
 * @param plist Plist document.
 * @param value Icon name.
 */
export function infoPlistBundleIconFileSet(plist: Plist, value: string | null) {
	const v = value === null ? null : new ValueString(value);
	infoPlistDictSet(plist, 'CFBundleIconFile', v);
}

/**
 * Set Info.plist bundle name.
 *
 * @param plist Plist document.
 * @param value Icon name.
 */
export function infoPlistBundleNameSet(plist: Plist, value: string | null) {
	const v = value === null ? null : new ValueString(value);
	infoPlistDictSet(plist, 'CFBundleName', v);
}

/**
 * Delete Info.plist bundle name.
 *
 * @param plist Plist document.
 */
export function infoPlistBundleDocumentTypesDelete(plist: Plist) {
	infoPlistDictSet(plist, 'CFBundleDocumentTypes', null);
}

/**
 * Get types of Mach-O data, array if FAT binary, else a single object.
 *
 * @param data Mach-O data.
 * @returns Mach-O types.
 */
export function machoTypesData(data: Readonly<Buffer>) {
	let le = false;
	const uint32 = (offset: number) => (
		le ? data.readUInt32LE(offset) : data.readUInt32BE(offset)
	);
	const type = (offset: number): IMachoType => ({
		cpuType: uint32(offset),
		cpuSubtype: uint32(offset + 4)
	});
	const magic = uint32(0);
	switch (magic) {
		case FAT_MAGIC: {
			const r = [];
			const count = uint32(4);
			let offset = 8;
			for (let i = 0; i < count; i++) {
				r.push(type(offset));
				offset += 20;
			}
			return r;
		}
		case MH_MAGIC:
		case MH_MAGIC_64: {
			return type(4);
		}
		case MH_CIGAM:
		case MH_CIGAM_64: {
			le = true;
			return type(4);
		}
		default: {
			throw new Error(`Unknown header magic: 0x${magic.toString(16)}`);
		}
	}
}

/**
 * Get types of Mach-O file, array if FAT binary, else a single object.
 *
 * @param path Mach-O file.
 * @returns Mach-O types.
 */
export async function machoTypesFile(path: string) {
	return machoTypesData(await fse.readFile(path));
}

/**
 * Unsign a Mach-O binary if signed.
 *
 * @param path Binary path.
 * @returns Returns true if signed, else false.
 */
export async function machoUnsignFile(path: string) {
	// Unsign data if signed.
	const unsigned = unsign(await fse.readFile(path));
	if (!unsigned) {
		return false;
	}

	// Write out the change.
	await fse.writeFile(path, Buffer.from(unsigned));
	return true;
}

/**
 * Unsign an application bundle.
 *
 * @param path Path to application bundle.
 */
export async function appUnsign(path: string) {
	const contents = pathJoin(path, 'Contents');
	const executable = infoPlistBundleExecutableGet(
		await plistRead(pathJoin(contents, 'Info.plist'))
	);
	await Promise.all([
		machoUnsignFile(pathJoin(contents, 'MacOS', executable)),
		fse.remove(pathJoin(contents, 'CodeResources')),
		fse.remove(pathJoin(contents, '_CodeSignature'))
	]);
}

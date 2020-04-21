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
	infoPlistDictSet(
		plist,
		'CFBundleExecutable',
		value === null ? null : new ValueString(value)
	);
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
	infoPlistDictSet(
		plist,
		'CFBundleIconFile',
		value === null ? null : new ValueString(value)
	);
}

/**
 * Set Info.plist bundle name.
 *
 * @param plist Plist document.
 * @param value Icon name.
 */
export function infoPlistBundleNameSet(plist: Plist, value: string | null) {
	infoPlistDictSet(
		plist,
		'CFBundleName',
		value === null ? null : new ValueString(value)
	);
}

/**
 * Delete Info.plist bundle name.
 *
 * @param plist Plist document.
 */
export function infoPlistBundleDocumentTypesDelete(plist: Plist) {
	infoPlistDictSet(plist, 'CFBundleName', null);
}

/**
 * Unsign a Mach-O binary if signed.
 *
 * @param path Binary path.
 * @returns Returns true if signed, else false.
 */
export async function machoUnsign(path: string) {
	const data = await fse.readFile(path);

	// Unsign data if signed.
	const unsigned = unsign(data);
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
	const macho = pathJoin(contents, 'MacOS', executable);
	await Promise.all([
		machoUnsign(macho),
		pathJoin(contents, 'CodeResources'),
		pathJoin(contents, '_CodeSignature')
	]);
}

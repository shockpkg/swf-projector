import {
	spawn as childProcessSpawn,
	SpawnOptions,
	SpawnOptionsWithoutStdio
} from 'child_process';

import {
	Entry,
	PathType
} from '@shockpkg/archive-files';
import * as entities from 'entities';
import sax from 'sax';

// Handle module loader differences between CJS and ESM.
const decodeXML = entities.decodeXML || (entities as any).default.decodeXML;
const encodeXML = entities.encodeXML || (entities as any).default.encodeXML;

/**
 * Default value if value is undefined.
 *
 * @param value Value.
 * @param defaultValue Default value.
 * @returns Value or the default value if undefined.
 */
export function defaultValue<T, U>(
	value: T,
	defaultValue: U
): Exclude<T | U, undefined> {
	// eslint-disable-next-line no-undefined
	return value === undefined ? defaultValue : (value as any);
}

/**
 * Default null if value is undefined.
 *
 * @param value Value.
 * @returns Value or null if undefined.
 */
export function defaultNull<T>(value: T) {
	return defaultValue(value, null);
}

/**
 * Default false if value is undefined.
 *
 * @param value Value.
 * @returns Value or false if undefined.
 */
export function defaultFalse<T>(value: T) {
	return defaultValue(value, false);
}

/**
 * Default true if value is undefined.
 *
 * @param value Value.
 * @returns Value or true if undefined.
 */
export function defaultTrue<T>(value: T) {
	return defaultValue(value, true);
}

/**
 * Check if Archive Entry is empty resource fork.
 *
 * @param entry Archive Entry.
 * @returns Is empty resource fork.
 */
export function entryIsEmptyResourceFork(entry: Entry) {
	return entry.type === PathType.RESOURCE_FORK && !entry.size;
}

/**
 * Find path relative from base, if base matches.
 *
 * @param path Path to match against.
 * @param start Search start.
 * @param nocase Match case-insensitive.
 * @returns Returns path, or null.
 */
export function pathRelativeBase(
	path: string,
	start: string,
	nocase = false
) {
	const p = nocase ? path.toLowerCase() : path;
	const s = nocase ? start.toLowerCase() : start;
	if (p === s) {
		return '';
	}
	if (p.startsWith(`${s}/`)) {
		return path.substr(s.length + 1);
	}
	return null;
}

/**
 * Same as pathRelativeBase, but retuns true on a match, else false.
 *
 * @param path Path to match against.
 * @param start Search start.
 * @param nocase Match case-insensitive.
 * @returns Returns true on match, else false.
 */
export function pathRelativeBaseMatch(
	path: string,
	start: string,
	nocase = false
) {
	const p = nocase ? path.toLowerCase() : path;
	const s = nocase ? start.toLowerCase() : start;
	if (p === s) {
		return true;
	}
	if (p.startsWith(`${s}/`)) {
		return true;
	}
	return false;
}

/**
 * Trim a file extenion.
 *
 * @param path File path.
 * @param ext File extension.
 * @param nocase Match case-insensitive.
 * @returns Path without file extension.
 */
export function trimExtension(
	path: string,
	ext: string,
	nocase = false
) {
	const p = nocase ? path.toLowerCase() : path;
	const e = nocase ? ext.toLowerCase() : ext;
	return p.endsWith(e) ? path.substr(0, p.length - e.length) : path;
}

/**
 * Encode string for XML.
 *
 * @param value String value.
 * @returns Escaped string.
 */
export function xmlEntitiesEncode(value: string) {
	return encodeXML(value);
}

/**
 * Decode string for XML.
 *
 * @param value Encoded value.
 * @returns Decoded string.
 */
export function xmlEntitiesDecode(value: string) {
	return decodeXML(value);
}

/**
 * Encode string into plist string tag.
 *
 * @param value String value.
 * @returns Plist string.
 */
export function plistStringTagEncode(value: string) {
	return `<string>${xmlEntitiesEncode(value)}</string>`;
}

/**
 * Decode string from plist string tag.
 *
 * @param xml XML tag.
 * @returns Plain string, or null.
 */
export function plistStringTagDecode(xml: string) {
	const start = '<string>';
	const end = '</string>';
	if (!xml.startsWith(start) || !xml.endsWith(end)) {
		return null;
	}
	const contents = xml.substring(start.length, xml.length - end.length);
	return xmlEntitiesDecode(contents);
}

/**
 * A small helper function for finding Info.plist values.
 *
 * @param xml XML string.
 * @param key Plist dict key.
 * @returns Found indexes or null.
 */
function infoPlistFind(
	xml: string,
	key: string
) {
	let replaceTagStart = -1;
	let replaceTagEnd = -1;

	const parser = sax.parser(true, {});

	// Get the tag path in a consistent way.
	const tagPath = () => {
		const tags = [...(parser as any).tags];
		const {tag} = (parser as any);
		if (tag && tags[tags.length - 1] !== tag) {
			tags.push(tag);
		}
		return tags.map(o => o.name as string);
	};

	const dictTag = () => {
		const path = tagPath();
		if (
			path.length !== 3 ||
			path[0] !== 'plist' ||
			path[1] !== 'dict'
		) {
			return null;
		}
		return path[2];
	};

	let keyTag = false;
	let nextTag = false;

	// eslint-disable-next-line @typescript-eslint/unbound-method
	parser.onerror = err => {
		throw err;
	};
	// eslint-disable-next-line @typescript-eslint/unbound-method
	parser.ontext = text => {
		if (keyTag && text === key) {
			nextTag = true;
		}
	};
	// eslint-disable-next-line @typescript-eslint/unbound-method
	parser.onopentag = node => {
		const tag = dictTag();
		if (!tag) {
			return;
		}
		if (tag === 'key') {
			keyTag = true;
			return;
		}
		if (!nextTag) {
			return;
		}

		if (replaceTagStart < 0) {
			replaceTagStart = parser.startTagPosition - 1;
		}
	};
	// eslint-disable-next-line @typescript-eslint/unbound-method
	parser.onclosetag = node => {
		const tag = dictTag();
		if (!tag) {
			return;
		}
		if (tag === 'key') {
			keyTag = false;
			return;
		}
		if (!nextTag) {
			return;
		}
		nextTag = false;

		if (replaceTagEnd < 0) {
			replaceTagEnd = parser.position;
		}
	};

	parser.write(xml).close();

	return (replaceTagStart < 0 || replaceTagEnd < 0) ?
		null :
		[replaceTagStart, replaceTagEnd];
}

/**
 * A small utility function for replacing Info.plist values.
 *
 * @param xml XML string.
 * @param key Plist dict key.
 * @param value Plist dict value, XML tag.
 * @returns Updated document.
 */
export function infoPlistReplace(
	xml: string,
	key: string,
	value: string
) {
	const found = infoPlistFind(xml, key);
	if (!found) {
		return xml;
	}
	// Splice in new value.
	const before = xml.substr(0, found[0]);
	const after = xml.substr(found[1]);
	return `${before}${value}${after}`;
}

/**
 * A small utility function for reading Info.plist values.
 *
 * @param xml XML string.
 * @param key Plist dict key.
 * @returns XML tag.
 */
export function infoPlistRead(
	xml: string,
	key: string
) {
	const found = infoPlistFind(xml, key);
	return found ? xml.substring(found[0], found[1]) : null;
}

/**
 * Spawn a subprocess with a promise for completion.
 *
 * @param command Command path.
 * @param args Argument list.
 * @param options Options object.
 * @returns Info object.
 */
export function spawn(
	command: string,
	args: string[] | null = null,
	options: SpawnOptions | SpawnOptionsWithoutStdio | null = null
) {
	const proc = childProcessSpawn(command, args || [], options || {});
	const done = new Promise<number | null>((resolve, reject) => {
		proc.on('exit', code => {
			resolve(code);
		});
		proc.on('error', err => {
			reject(err);
		});
	});
	return {
		proc,
		done
	};
}

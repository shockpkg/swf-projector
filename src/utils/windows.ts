import {
	signatureGet,
	signatureSet
} from 'portable-executable-signature';
import * as resedit from 'resedit';
import fse from 'fs-extra';

import {
	bufferToArrayBuffer
} from '../util';

const ResEditNtExecutable =
	resedit.NtExecutable ||
	(resedit as any).default.NtExecutable;

const ResEditNtExecutableResource =
	resedit.NtExecutableResource ||
	(resedit as any).default.NtExecutableResource;

const ResEditResource =
	resedit.Resource ||
	(resedit as any).default.Resource;

const ResEditData =
	resedit.Data ||
	(resedit as any).default.Data;

export interface IPeResourceReplace {

	/**
	 * Replace icons if not null.
	 *
	 * @default null
	 */
	iconData?: Readonly<Buffer> | null;

	/**
	 * Replace version strings if not null.
	 *
	 * @default null
	 */
	versionStrings?: Readonly<{[key: string]: string}> | null;

	/**
	 * If true remove signature if present.
	 *
	 * @default false
	 */
	removeSignature?: boolean | null;
}

/**
 * Replace resources in Windows PE file.
 *
 * @param path File path.
 * @param options Replacement options.
 */
export async function peResourceReplace(
	path: string,
	options: Readonly<IPeResourceReplace>
) {
	const {
		iconData,
		versionStrings,
		removeSignature
	} = options;

	// Read EXE file and remove signature if present.
	const exeOriginal = await fse.readFile(path);
	const signedData = removeSignature ? null : signatureGet(exeOriginal);
	let exeData = signatureSet(exeOriginal, null, true, true);

	// Parse resources.
	const exe = ResEditNtExecutable.from(exeData);
	const res = ResEditNtExecutableResource.from(exe);

	// Replace all the icons in all icon groups.
	if (iconData) {
		const ico = ResEditData.IconFile.from(
			bufferToArrayBuffer(iconData)
		);
		for (const iconGroup of ResEditResource.IconGroupEntry.fromEntries(
			res.entries
		)) {
			ResEditResource.IconGroupEntry.replaceIconsForResource(
				res.entries,
				iconGroup.id,
				iconGroup.lang,
				ico.icons.map(icon => icon.data)
			);
		}
	}

	// Update strings if present for all the languages.
	if (versionStrings) {
		for (const versionInfo of ResEditResource.VersionInfo.fromEntries(
			res.entries
		)) {
			// Unfortunately versionInfo.getAvailableLanguages() skips some.
			// Get the full list from the internal data.
			const languages = (versionInfo as any).data.strings
				.map((o: any) => ({
					lang: o.lang as (number | string),
					codepage: o.codepage as (number | string)
				}));

			for (const language of languages) {
				versionInfo.setStringValues(language, versionStrings);
			}
			versionInfo.outputToResourceEntries(res.entries);
		}
	}

	// Update resources.
	res.outputResource(exe);
	exeData = exe.generate();

	// Add back signature if not removing.
	if (signedData) {
		exeData = signatureSet(exeData, signedData, true, true);
	}

	// Write updated EXE file.
	await fse.writeFile(path, Buffer.from(exeData));
}

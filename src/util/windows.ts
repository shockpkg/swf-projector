import {signatureGet, signatureSet} from 'portable-executable-signature';
import {NtExecutable, NtExecutableResource, Resource} from '@shockpkg/resedit';

import {launcher} from '../util';

import {align} from './internal/data';
import {patchOnce} from './internal/patch';
import {
	IDD_RESERVED,
	IDD_RESOURCE,
	IMAGE_SCN_CNT_INITIALIZED_DATA,
	IMAGE_SCN_MEM_READ
} from './internal/windows/constants';
import {
	exeAssertLastSection,
	exeCodeSection,
	exeRemoveReloc,
	exeUpdateSizes
} from './internal/windows/exe';
import {ood32} from './internal/windows/ood32';
import {ood64} from './internal/windows/ood64';
import {rsrcPatchIcon, rsrcPatchVersion} from './internal/windows/rsrc';
import {
	patchWindowTitleData,
	patchWindowTitleRsrc
} from './internal/windows/title';

/**
 * Windows projector patch.
 */
export interface IWindowsProjectorPatch {
	/**
	 * Replace icons if not null.
	 *
	 * @default null
	 */
	iconData?: Readonly<Uint8Array> | null;

	/**
	 * Replace version strings if not null.
	 *
	 * @default null
	 */
	versionStrings?: Readonly<{[key: string]: string}> | null;

	/**
	 * Remove signature if present and true.
	 *
	 * @default false
	 */
	removeCodeSignature?: boolean;

	/**
	 * Attempt to replace Windows window title if not null.
	 *
	 * @default null
	 */
	patchWindowTitle?: string | null;

	/**
	 * Attempt to disable the out-of-date check if true.
	 *
	 * @default false
	 */
	patchOutOfDateDisable?: boolean;
}

/**
 * Apply patches to projector.
 *
 * @param data Projector data.
 * @param options Patch options.
 * @returns Patched projector.
 */
export function windowsProjectorPatch(
	data: Readonly<Uint8Array>,
	options: Readonly<IWindowsProjectorPatch>
) {
	const {
		iconData,
		versionStrings,
		removeCodeSignature,
		patchWindowTitle,
		patchOutOfDateDisable
	} = options;

	// Remove signature, possibly preserved for later.
	const signature = removeCodeSignature ? null : signatureGet(data);
	let d = signatureSet(data, null, true, true);

	// Parse the EXE once, if needed.
	let exe: NtExecutable | null = null;

	// Patch the out-of-date check.
	if (patchOutOfDateDisable) {
		exe = exe || NtExecutable.from(d);

		// Narrow the search to just the code section and patch.
		const code = exeCodeSection(exe);
		const {data} = code;
		patchOnce(
			new Uint8Array(data),
			exe.newHeader.is32bit() ? ood32 : ood64,
			'Out Of Date Disable'
		);
		code.data = data;
	}

	// Do patches that require changing size.
	if (iconData || versionStrings || patchWindowTitle) {
		exe = exe || NtExecutable.from(d);

		// Remove reloc so rsrc can safely be resized.
		const relocRestore = exeRemoveReloc(exe);

		// Remove rsrc to modify and so sections can be added.
		exeAssertLastSection(exe, IDD_RESOURCE, '.rsrc');
		const rsrc = NtExecutableResource.from(exe);
		exe.setSectionByEntry(IDD_RESOURCE, null);

		if (iconData) {
			rsrcPatchIcon(rsrc, iconData);
		}

		if (versionStrings) {
			rsrcPatchVersion(rsrc, versionStrings);
		}

		// If patching title and cannot be done by resource changes.
		let sdTitle: ArrayBuffer | null = null;
		if (
			typeof patchWindowTitle === 'string' &&
			!patchWindowTitleRsrc(rsrc, patchWindowTitle)
		) {
			const l = patchWindowTitle.length;
			sdTitle = new ArrayBuffer(align((l + 1) * 2, 16));
			const v = new DataView(sdTitle);
			for (let i = 0; i < l; i++) {
				v.setUint16(i * 2, patchWindowTitle.charCodeAt(i), true);
			}
		}

		// Assemble new data section if any.
		if (sdTitle) {
			// PE library lacks a way to add an arbitrary section.
			// Using the reserved index temporarily, then clearing it.
			const entry = IDD_RESERVED as number;
			exe.setSectionByEntry(entry, {
				info: {
					name: '.shockd',
					virtualSize: sdTitle.byteLength,
					virtualAddress: 0,
					sizeOfRawData: sdTitle.byteLength,
					pointerToRawData: 0,
					pointerToRelocations: 0,
					pointerToLineNumbers: 0,
					numberOfRelocations: 0,
					numberOfLineNumbers: 0,
					characteristics:
						// eslint-disable-next-line no-bitwise
						IMAGE_SCN_CNT_INITIALIZED_DATA | IMAGE_SCN_MEM_READ
				},
				data: sdTitle
			});
			const s = exe.getSectionByEntry(entry);
			exe.newHeader.optionalHeaderDataDirectory.set(entry, {
				virtualAddress: 0,
				size: 0
			});
			if (!s) {
				throw new Error('Internal error');
			}

			// Patch title if in the data.
			if (sdTitle) {
				patchWindowTitleData(exe, s.info.virtualAddress);
			}
		}

		// Add rsrc back.
		rsrc.outputResource(exe, false, true);

		// Add reloc back.
		relocRestore();

		// Update sizes.
		exeUpdateSizes(exe);
	}

	// If the EXE was parsed generate new data from it.
	if (exe) {
		d = exe.generate();
	}

	// Add back signature if one preserved.
	if (signature) {
		d = signatureSet(d, signature, true, true);
	}

	return new Uint8Array(d);
}

/**
 * Get Windows launcher for the specified type.
 *
 * @param type Executable type.
 * @param resources Data to optionally copy resources from.
 * @returns Launcher data.
 */
export async function windowsLauncher(
	type: 'i686' | 'x86_64',
	resources: (() => Promise<Uint8Array>) | null = null
) {
	let data;
	switch (type) {
		case 'i686': {
			data = await launcher('windows-i686');
			break;
		}
		case 'x86_64': {
			data = await launcher('windows-x86_64');
			break;
		}
		default: {
			throw new Error(`Invalid type: ${type as string}`);
		}
	}

	// Check if copying resources.
	if (!resources) {
		return data;
	}

	// Read resources from file.
	const rsrc = NtExecutableResource.from(
		NtExecutable.from(await resources(), {
			ignoreCert: true
		})
	);

	// Find the first icon group for each language.
	const resIconGroups = new Map<string | number, Resource.IconGroupEntry>();
	for (const iconGroup of Resource.IconGroupEntry.fromEntries(rsrc.entries)) {
		const known = resIconGroups.get(iconGroup.lang) || null;
		if (!known || iconGroup.id < known.id) {
			resIconGroups.set(iconGroup.lang, iconGroup);
		}
	}

	// List the groups and icons to be kept.
	const iconGroups = new Set();
	const iconDatas = new Set();
	for (const [, group] of resIconGroups) {
		iconGroups.add(group.id);
		for (const icon of group.icons) {
			iconDatas.add(icon.iconID);
		}
	}

	// Filter out the resources to keep.
	const typeVersionInfo = 16;
	const typeIcon = 3;
	const typeIconGroup = 14;
	rsrc.entries = rsrc.entries.filter(
		entry =>
			entry.type === typeVersionInfo ||
			(entry.type === typeIcon && iconDatas.has(entry.id)) ||
			(entry.type === typeIconGroup && iconGroups.has(entry.id))
	);

	// Remove signature if present.
	const signedData = signatureGet(data);
	let exeData = signatureSet(data, null, true, true);

	// Parse launcher.
	const exe = NtExecutable.from(exeData);

	// Remove reloc so rsrc can safely be resized.
	const relocRestore = exeRemoveReloc(exe);

	// Apply resources to launcher.
	rsrc.outputResource(exe, false, true);

	// Add reloc back.
	relocRestore();

	// Update sizes.
	exeUpdateSizes(exe);

	// Generated the updated launcher.
	exeData = exe.generate();

	// Add back signature if one present.
	if (signedData) {
		exeData = signatureSet(exeData, signedData, true, true);
	}

	return new Uint8Array(exeData);
}

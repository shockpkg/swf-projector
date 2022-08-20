import {launcher} from '../util';

import {findExact, findFuzzy, readCstr, patchOnce} from './internal/patch';
import {menuRemovePatches32} from './internal/linux/menu32';
import {menuRemovePatches64} from './internal/linux/menu64';
import {offsetPatches64} from './internal/linux/offset64';
import {linuxPatchProjectorPathPatches} from './internal/linux/path32';
import {linux64PatchProjectorPathPatches} from './internal/linux/path64';

/**
 * Attempt to replace Linux 32-bit menu title.
 *
 * @param data Projector data, maybe modified.
 * @param title Replacement title.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linuxPatchWindowTitle(data: Buffer, title: string) {
	// Encode the replacement string.
	const titleData = Buffer.from(title, 'utf8');

	// Titles should match one of these.
	const regAFP = /^Adobe Flash Player \d+(,\d+,\d+,\d+)?$/;
	const regMFP = /^Macromedia Flash Player \d+(,\d+,\d+,\d+)?$/;

	const targets: Buffer[] = [];

	/**
	 * Matched.
	 *
	 * @param cstr C-String.
	 */
	const matched = (cstr: Buffer) => {
		if (!(titleData.length < cstr.length)) {
			throw new Error(
				`Replacement window title larger than ${cstr.length - 1}`
			);
		}
		targets.push(cstr);
	};

	for (const offset of findExact(data, '\0Adobe Flash Player ')) {
		const cstr = readCstr(data, offset + 1, true, false);
		const [str] = cstr.toString('ascii').split('\0', 1);
		if (regAFP.test(str)) {
			matched(cstr);
		}
	}

	if (!targets.length) {
		// Not sure why Flash Player 9 is like this, but this does find it.
		for (const offset of findExact(data, '\x08Adobe Flash Player ')) {
			const cstr = readCstr(data, offset + 1, true, false);
			const [str] = cstr.toString('ascii').split('\0', 1);
			if (regAFP.test(str)) {
				matched(cstr);
			}
		}
	}

	if (!targets.length) {
		for (const offset of findExact(data, '\0Macromedia Flash Player ')) {
			const cstr = readCstr(data, offset + 1, true, false);
			const [str] = cstr.toString('ascii').split('\0', 1);
			if (regMFP.test(str)) {
				matched(cstr);
			}
		}
	}

	// Write replacement strings into found slices.
	for (const target of targets) {
		target.fill(0);
		titleData.copy(target);
	}

	return data;
}

/**
 * Attempt to replace Linux 64-bit menu title.
 *
 * @param data Projector data, maybe modified.
 * @param title Replacement title.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linux64PatchWindowTitle(data: Buffer, title: string) {
	// Can just use the 32-bit patcher.
	return linuxPatchWindowTitle(data, title);
}

/**
 * Attempt to patch Linux 32-bit menu showing code.
 * NOP over the gtk_widget_show for gtk_menu_bar_new.
 * Also NOP over the calls to gtk_menu_shell_insert when present.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linuxPatchMenuRemoveData(data: Buffer) {
	patchOnce(data, menuRemovePatches32());
	return data;
}

/**
 * Attempt to patch Linux 64-bit menu showing code.
 * NOP over the gtk_widget_show for gtk_menu_bar_new.
 * Also NOP over the calls to gtk_menu_shell_insert.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linux64PatchMenuRemoveData(data: Buffer) {
	patchOnce(data, menuRemovePatches64());
	return data;
}

/**
 * Attempt to patch Linux 64-bit projector offset code.
 * Replaces old 32-bit ELF header reading logic with 64-bit logic.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linux64PatchProjectorOffsetData(data: Buffer) {
	patchOnce(data, offsetPatches64());
	return data;
}

/**
 * Attempt to patch Linux 32-bit projector path code.
 * Replaces bad "file:" prefix with "file://" for projector self URL.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linuxPatchProjectorPathData(data: Buffer) {
	// Find candidates for the string to replace the reference to.
	const fileNoSlashes = [...findExact(data, '\0file:\0')].map(i => i + 1);
	if (!fileNoSlashes.length) {
		throw new Error('No projector path patch "file:" strings');
	}

	// Find the replacement string.
	const fileSlashes = data.indexOf('\0file://\0') + 1;
	if (!fileSlashes) {
		throw new Error('No projector path patch "file://" strings');
	}

	// Search the buffer for patch candidates, testing patches for relevance.
	let patchFound = null;
	let patchOffset = -1;
	for (const patch of linuxPatchProjectorPathPatches()) {
		for (const offset of findFuzzy(data, patch.find)) {
			// Test patch without applying.
			if (!patch.patch(data, offset, fileNoSlashes, fileSlashes, false)) {
				continue;
			}
			if (patchFound) {
				throw new Error(
					'Multiple projector path patch candidates found'
				);
			}
			patchFound = patch;
			patchOffset = offset;
		}
	}
	if (!patchFound) {
		throw new Error('No projector path patch candidates found');
	}

	// Apply patch, this should not fail.
	if (
		!patchFound.patch(data, patchOffset, fileNoSlashes, fileSlashes, true)
	) {
		throw new Error('Internal error');
	}

	return data;
}

/**
 * Attempt to patch Linux 64-bit projector path code.
 * Replaces bad "file:" prefix with "file://" for projector self URL.
 *
 * @param data Projector data, maybe modified.
 * @returns Patched data, can be same buffer, but modified.
 */
export function linux64PatchProjectorPathData(data: Buffer) {
	// Find candidates for the string to replace the reference to.
	const fileNoSlashes = [...findExact(data, '\0file:\0')].map(i => i + 1);
	if (!fileNoSlashes.length) {
		throw new Error('No projector path patch "file:" strings');
	}

	// Find the replacement string.
	const fileSlashes = data.indexOf('\0file://\0') + 1;
	if (!fileSlashes) {
		throw new Error('No projector path patch "file://" strings');
	}

	// Search the buffer for patch candidates, check if they point at string.
	let patchFound = null;
	let patchOffset = -1;
	for (const patch of linux64PatchProjectorPathPatches()) {
		for (const offset of findFuzzy(data, patch.find)) {
			const offsetRel = offset + patch.offset;
			const relative = data.readInt32LE(offsetRel);
			const offsetAfter = offsetRel + 4;
			const offsetTarget = offsetAfter + relative;
			if (fileNoSlashes.includes(offsetTarget)) {
				if (patchFound) {
					throw new Error(
						'Multiple projector path patch candidates found'
					);
				}
				patchFound = patch;
				patchOffset = offset;
			}
		}
	}
	if (!patchFound) {
		throw new Error('No projector path patch candidates found');
	}

	// Write the replacement offset.
	const offsetRel = patchOffset + patchFound.offset;
	const offsetAfter = offsetRel + 4;
	const relative = fileSlashes - offsetAfter;
	data.writeInt32LE(relative, offsetRel);
	return data;
}

/**
 * Get Linux launcher for the specified type.
 *
 * @param type Executable type.
 * @returns Launcher data.
 */
export async function linuxLauncher(type: 'i386' | 'x86_64') {
	switch (type) {
		case 'i386': {
			return launcher('linux-i386');
		}
		case 'x86_64': {
			return launcher('linux-x86_64');
		}
		default: {
			throw new Error(`Invalid type: ${type as string}`);
		}
	}
}

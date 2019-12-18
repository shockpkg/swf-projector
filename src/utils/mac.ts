import {
	spawn
} from '../util';

/**
 * Uses the Mac codesign utility to remove any code signatures.
 *
 * @param path Pathto files or bundle to remove code signture from.
 * @param codesignPath Optional path to the codesign binary.
 * @deprecated No longer used in this package.
 */
export async function macCodesignRemove(
	path: string,
	codesignPath: string | null = null
) {
	const cmd = codesignPath || 'codesign';
	const args = [
		'--remove-signature',
		path.startsWith('-') ? `./${path}` : path
	];
	const {done} = spawn(cmd, args);
	const code = await done;
	if (!code) {
		return;
	}
	throw new Error(
		`Removing code signature failed: ${cmd} exit code: ${code}`
	);
}

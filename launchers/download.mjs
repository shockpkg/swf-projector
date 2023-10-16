/* eslint-disable jsdoc/require-jsdoc */
import {fileURLToPath} from 'node:url';
import {join as pathJoin} from 'node:path';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const OUT = pathJoin(DIR, 'data');
const MANIFEST = pathJoin(DIR, 'manifest.json');

function sha256(data) {
	return createHash('sha256').update(data).digest('hex');
}

async function ensure({file, url, hash}) {
	const out = pathJoin(OUT, file);
	{
		const existing = await readFile(out).catch(() => null);
		if (existing) {
			if (sha256(await readFile(out)) === hash) {
				return;
			}
			await rm(out, {force: true});
		}
	}
	const response = await fetch(url);
	if (response.status !== 200) {
		throw new Error(`Status ${response.status}: ${url}`);
	}
	const body = new Uint8Array(await response.arrayBuffer());
	{
		const hashed = sha256(body);
		if (hashed !== hash) {
			throw new Error(`Invalid hash: ${hashed}`);
		}
	}
	await writeFile(out, body);
}

async function main() {
	const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
	await mkdir(OUT, {recursive: true});
	await Promise.all(manifest.map(ensure));
}
main().catch(err => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exitCode = 1;
});

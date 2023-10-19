import {basename, dirname, join as pathJoin} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';

import {Bundle} from '../bundle';
import {ProjectorHtml} from '../projector/html';
import {htmlEncode, trimExtension} from '../util';

/**
 * BundleHtml object.
 */
export class BundleHtml extends Bundle {
	/**
	 * Custom subdirectory to nest resources into.
	 * Defaults to a directory of the same name as the launcher file.
	 */
	public subdir: string | null = null;

	/**
	 * Custom subdirectory index file.
	 * Defaults to index.ext where ext is the same as the launcher file.
	 */
	public index: string | null = null;

	/**
	 * ProjectorHtml instance.
	 */
	public readonly projector: ProjectorHtml;

	/**
	 * BundleHtml constructor.
	 *
	 * @param path Output path.
	 * @param flat Flat bundle.
	 */
	constructor(path: string, flat = false) {
		super(path, flat);

		this.projector = this._createProjector();
	}

	/**
	 * Main application file extension.
	 *
	 * @returns File extension.
	 */
	public get extension() {
		const a = basename(this.path).split('.');
		const ext = a.length > 1 ? a.pop() : '';
		if (!ext) {
			throw new Error('Failed to extract extension');
		}
		return `.${ext}`;
	}

	/**
	 * Get the nested subdirectory.
	 *
	 * @returns Directory name.
	 */
	public get nestedSubdir() {
		return (
			this.subdir || trimExtension(basename(this.path), this.extension)
		);
	}

	/**
	 * Get the nested index.
	 *
	 * @returns File name.
	 */
	public get nestedIndex() {
		return this.index || `index${this.extension}`;
	}

	/**
	 * Get launcher HTML code.
	 *
	 * @returns HTML code.
	 */
	public getLauncher() {
		const {projector, nestedSubdir, nestedIndex} = this;
		const {lang, title} = projector;
		const path = `${nestedSubdir}/${nestedIndex}`;
		const url = path.replaceAll('\\', '/');
		const docAttr = lang === null ? '' : ` lang=${htmlEncode(lang, true)}`;

		return [
			'<!DOCTYPE html>',
			`<html${docAttr}>`,
			' <head>',
			'  <meta charset="UTF-8">',
			'  <meta http-equiv="X-UA-Compatible" content="IE=Edge">',
			`  <meta http-equiv="refresh" content="0; url=${htmlEncode(
				url,
				true
			)}">`,
			...(title === null
				? []
				: [`  <title>${htmlEncode(title)}</title>`]),
			' </head>',
			' <body></body>',
			'</html>',
			''
		]
			.map(s => s.replace(/^\s+/, s => '\t'.repeat(s.length)))
			.join('\n');
	}

	/**
	 * @inheritdoc
	 */
	protected async _close(): Promise<void> {
		if (!this.flat) {
			await this._writeLauncher();
		}
		await super._close();
	}

	/**
	 * @inheritdoc
	 */
	protected _getProjectorPathNested(): string {
		return pathJoin(
			dirname(this.path),
			this.nestedSubdir,
			this.nestedIndex
		);
	}

	/**
	 * Create projector instance for the bundle.
	 *
	 * @returns Projector instance.
	 */
	protected _createProjector() {
		return new ProjectorHtml(this._getProjectorPath());
	}

	/**
	 * Write the launcher file.
	 */
	protected async _writeLauncher() {
		const {path} = this;
		await mkdir(dirname(path), {recursive: true});
		await writeFile(path, this.getLauncher());
	}
}

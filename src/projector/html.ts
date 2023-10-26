import {dirname} from 'node:path';
import {mkdir, writeFile} from 'node:fs/promises';

import {Projector} from '../projector';
import {htmlEncode} from '../util';

/**
 * ProjectorHtml object.
 */
export class ProjectorHtml extends Projector {
	/**
	 * The HTML document lang.
	 */
	public lang: string | null = null;

	/**
	 * The HTML document title.
	 */
	public title: string | null = null;

	/**
	 * HTML document background style.
	 */
	public background: string | null = null;

	/**
	 * HTML document color style.
	 */
	public color: string | null = null;

	/**
	 * Required <object> classid attribute.
	 */
	public classid: string = 'clsid:D27CDB6E-AE6D-11CF-96B8-444553540000';

	/**
	 * Required <embed> type attribute.
	 */
	public type: string = 'application/x-shockwave-flash';

	/**
	 * The <object> codebase attribute.
	 */
	public codebase: string | null = null;

	/**
	 * The <embed> codebase attribute.
	 */
	public pluginspage: string | null = null;

	/**
	 * Required src/movie URL (unless using custom HTML).
	 */
	public src: string = '';

	/**
	 * Required movie width (unless using custom HTML).
	 */
	public width: string | number | null = null;

	/**
	 * Required movie height (unless using custom HTML).
	 */
	public height: string | number | null = null;

	/**
	 * The name for object, param, and embed elements.
	 */
	public name: string | null = null;

	/**
	 * The id for the object element.
	 */
	public id: string | null = null;

	/**
	 * The movie background color.
	 */
	public bgcolor: string | null = null;

	/**
	 * The play attribute.
	 */
	public play: string | boolean | null = null;

	/**
	 * The loop attribute.
	 */
	public loop: string | boolean | null = null;

	/**
	 * The menu attribute.
	 */
	public menu: string | boolean | null = null;

	/**
	 * The quality attribute (low | autolow | autohigh | medium | high | best).
	 */
	public quality: string | null = null;

	/**
	 * The scale attribute (default | noborder | exactfit | noscale).
	 */
	public scale: string | null = null;

	/**
	 * The align attribute (l | r | t).
	 */
	public align: string | null = null;

	/**
	 * The salign attribute (l | t | r | tl | tr).
	 */
	public salign: string | null = null;

	/**
	 * The wmode attribute (window | direct | opaque | transparent | gpu).
	 */
	public wmode: string | null = null;

	/**
	 * The base attribute (URL or path).
	 */
	public base: string | null = null;

	/**
	 * The allowFullScreen attribute (true | false).
	 */
	public allowFullScreen: string | boolean | null = null;

	/**
	 * The allowFullScreenInteractive attribute (true | false), for AIR.
	 */
	public allowFullScreenInteractive: string | boolean | null = null;

	/**
	 * The allowScriptAccess attribute (always | sameDomain | never).
	 */
	public allowScriptAccess: string | null = null;

	/**
	 * The allowNetworking attribute (all | internal | none), for AIR.
	 */
	public allowNetworking: string | null = null;

	/**
	 * The fullScreenAspectRatio attribute (portrait | landscape).
	 */
	public fullScreenAspectRatio: string | null = null;

	/**
	 * The flashvars attribute (variable key=value pairs).
	 */
	public flashvars: string | null = null;

	/**
	 * The browserzoom attribute (scale | noscale).
	 */
	public browserzoom: string | null = null;

	/**
	 * The devicefont attribute (try to render static text as device text).
	 */
	public devicefont: string | boolean | null = null;

	/**
	 * The swliveconnect attribute (liveconnect?).
	 */
	public swliveconnect: string | boolean | null = null;

	/**
	 * The expressinstall attribute (for express install?).
	 */
	public expressinstall: string | null = null;

	/**
	 * The swfversion attribute (for update checking?).
	 */
	public swfversion: string | number | null = null;

	/**
	 * Custom HTML to use instead of generated HTML.
	 */
	public html:
		| string
		| ((self: this) => string)
		| ((self: this) => Promise<string>)
		| null = null;

	/**
	 * ProjectorHtml constructor.
	 *
	 * @param path Output path.
	 */
	constructor(path: string) {
		super(path);
	}

	/**
	 * @inheritdoc
	 */
	public async write() {
		const {path} = this;
		await mkdir(dirname(path), {recursive: true});
		await writeFile(path, await this.getHtml());
	}

	/**
	 * Get HTML document code.
	 *
	 * @returns HTML code.
	 */
	public async getHtml() {
		const {html} = this;
		if (html) {
			return typeof html === 'function' ? html(this) : html;
		}
		return this.getHtmlDefault();
	}

	/**
	 * Get the default HTML document code.
	 *
	 * @returns HTML code.
	 */
	public getHtmlDefault() {
		const {
			lang,
			title,
			background,
			color,
			classid,
			type,
			codebase,
			pluginspage,
			src,
			width,
			height,
			id,
			name,
			bgcolor,
			play,
			loop,
			menu,
			quality,
			scale,
			align,
			salign,
			wmode,
			base,
			allowFullScreen,
			allowFullScreenInteractive,
			allowScriptAccess,
			allowNetworking,
			fullScreenAspectRatio,
			flashvars,
			browserzoom,
			devicefont,
			swliveconnect,
			expressinstall,
			swfversion
		} = this;

		if (!src) {
			throw new Error('Required property: src');
		}
		if (width === null) {
			throw new Error('Required property: width');
		}
		if (height === null) {
			throw new Error('Required property: height');
		}

		const object = new Map<string, string>();
		object.set('classid', classid);
		if (codebase !== null) {
			object.set('codebase', codebase);
		}
		object.set('width', `${width}`);
		object.set('height', `${height}`);
		if (id !== null) {
			object.set('id', id);
		}

		const param = new Map<string, string>();
		param.set('movie', src);

		const embed = new Map<string, string>();
		embed.set('type', type);
		if (pluginspage !== null) {
			embed.set('pluginspage', pluginspage);
		}
		embed.set('width', `${width}`);
		embed.set('height', `${height}`);
		embed.set('src', src);

		if (name !== null) {
			object.set('name', name);
			param.set('name', name);
			embed.set('name', name);
		}

		for (const [k, v] of [
			['bgcolor', bgcolor],
			['play', play],
			['loop', loop],
			['menu', menu],
			['quality', quality],
			['scale', scale],
			['align', align],
			['salign', salign],
			['wmode', wmode],
			['base', base],
			['allowfullscreen', allowFullScreen],
			['allowfullscreeninteractive', allowFullScreenInteractive],
			['allowscriptsccess', allowScriptAccess],
			['allownetworking', allowNetworking],
			['fullscreenaspectratio', fullScreenAspectRatio],
			['flashvars', flashvars],
			['browserzoom', browserzoom],
			['devicefont', devicefont],
			['swliveconnect', swliveconnect],
			['expressinstall', expressinstall],
			['swfversion', swfversion]
		] as [string, string | number | boolean | null][]) {
			if (v !== null) {
				param.set(k, `${v}`);
				embed.set(k, `${v}`);
			}
		}

		const docAttr = lang === null ? '' : ` lang=${htmlEncode(lang, true)}`;

		return [
			'<!DOCTYPE html>',
			`<html${docAttr}>`,
			' <head>',
			'  <meta charset="UTF-8">',
			'  <meta http-equiv="X-UA-Compatible" content="IE=Edge">',
			...(title === null
				? []
				: [`  <title>${htmlEncode(title)}</title>`]),
			'  <style>',
			'   * {',
			'    margin: 0;',
			'    padding: 0;',
			'   }',
			'   html,',
			'   body {',
			'    height: 100%;',
			'   }',
			'   body {',
			...(background === null
				? []
				: [`    background: ${htmlEncode(background)};`]),
			...(color === null ? [] : [`    color: ${htmlEncode(color)};`]),
			'    font-family: Verdana, Geneva, sans-serif;',
			'   }',
			'   object,',
			'   embed {',
			'    display: block;',
			'    outline: 0;',
			'   }',
			'   object:focus,',
			'   embed:focus {',
			'    outline: 0;',
			'   }',
			'   .main {',
			'    display: table;',
			'    height: 100%;',
			'    width: 100%;',
			'   }',
			'   .player {',
			'    display: table-cell;',
			'    vertical-align: middle;',
			'   }',
			'   .player object,',
			'   .player embed {',
			'    margin: 0 auto;',
			'   }',
			'  </style>',
			' </head>',
			' <body>',
			'  <div class="main">',
			'   <div class="player">',
			'    <object',
			...[...object.entries()].map(
				([a, v]) => `     ${a}="${htmlEncode(v, true)}"`
			),
			'    >',
			...[...param.entries()].map(
				([a, v]) =>
					`     <param name="${a}" value="${htmlEncode(v, true)}">`
			),
			'     <embed',
			...[...embed.entries()].map(
				([a, v]) => `      ${a}="${htmlEncode(v, true)}"`
			),
			'     >',
			'    </object>',
			'   </div>',
			'  </div>',
			' </body>',
			'</html>',
			''
		]
			.map(s => s.replace(/^\s+/, s => '\t'.repeat(s.length)))
			.join('\n');
	}
}

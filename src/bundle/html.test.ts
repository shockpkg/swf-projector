import {describe, it} from 'node:test';
import {ok} from 'node:assert';
import {join as pathJoin} from 'node:path';

import {cleanBundlesDir, fixtureFile} from '../util.spec.ts';
import {Bundle} from '../bundle.ts';

import {BundleHtml} from './html.ts';

const getDir = async (d: string) => cleanBundlesDir('html', d);

void describe('bundle/html', () => {
	void describe('BundleHtml', () => {
		void it('instanceof', () => {
			ok(BundleHtml.prototype instanceof Bundle);
		});

		void it('simple', async () => {
			const dir = await getDir('simple');
			const dest = pathJoin(dir, 'application.html');

			const b = new BundleHtml(dest);
			const p = b.projector;
			p.src = 'movie.swf';
			p.width = 600;
			p.height = 400;
			await b.write(async b => {
				await b.copyResource('movie.swf', fixtureFile('swf3.swf'));
			});
		});

		void it('complex', async () => {
			const dir = await getDir('complex');
			const dest = pathJoin(dir, 'application.html');

			const b = new BundleHtml(dest);
			const p = b.projector;
			p.src = 'movie.swf';
			p.width = 600;
			p.height = 400;
			p.lang = 'en-US';
			p.title = 'A "special" title with <html> characters';
			p.background = '#000000';
			p.color = '#999999';
			p.bgcolor = '#000000';
			p.id = 'element-id';
			p.name = 'element-name';
			p.codebase =
				'https://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=32,0,0,0';
			p.pluginspage = 'https://www.adobe.com/go/getflashplayer';
			p.play = true;
			p.loop = true;
			p.menu = true;
			p.quality = 'high';
			p.scale = 'default';
			p.align = 'l';
			p.salign = 'l';
			p.wmode = 'opaque';
			p.base = '.';
			p.allowFullScreen = true;
			p.allowFullScreenInteractive = true;
			p.allowScriptAccess = 'always';
			p.allowNetworking = 'all';
			p.fullScreenAspectRatio = 'landscape';
			p.flashvars = 'param1=value1&param2=value2';
			p.browserzoom = 'scale';
			p.devicefont = false;
			p.swliveconnect = true;
			p.expressinstall = 'expressinstall.swf';
			p.swfversion = 32;
			await b.write(async b => {
				await b.copyResource('movie.swf', fixtureFile('swf3.swf'));
			});
		});

		void it('flat', async () => {
			const dir = await getDir('flat');
			const dest = pathJoin(dir, 'application.html');

			const b = new BundleHtml(dest, true);
			const p = b.projector;
			p.src = 'movie.swf';
			p.width = 600;
			p.height = 400;
			await b.write(async b => {
				await b.copyResource('movie.swf', fixtureFile('swf3.swf'));
			});
		});
	});
});

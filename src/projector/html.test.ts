import {describe, it} from 'node:test';
import {ok} from 'node:assert';
import {copyFile} from 'node:fs/promises';
import {join as pathJoin} from 'node:path';

import {cleanProjectorDir, fixtureFile} from '../util.spec.ts';
import {Projector} from '../projector.ts';

import {ProjectorHtml} from './html.ts';

const getDir = async (d: string) => cleanProjectorDir('html', d);

void describe('projector/html', () => {
	void describe('ProjectorHtml', () => {
		void it('instanceof', () => {
			ok(ProjectorHtml.prototype instanceof Projector);
		});

		void it('simple', async () => {
			const dir = await getDir('simple');
			const dest = pathJoin(dir, 'page.html');

			const p = new ProjectorHtml(dest);
			p.src = 'movie.swf';
			p.width = 600;
			p.height = 400;
			await p.write();

			await copyFile(fixtureFile('swf3.swf'), pathJoin(dir, 'movie.swf'));
		});

		void it('complex', async () => {
			const dir = await getDir('complex');
			const dest = pathJoin(dir, 'page.html');

			const p = new ProjectorHtml(dest);
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
			await p.write();

			await copyFile(fixtureFile('swf3.swf'), pathJoin(dir, 'movie.swf'));
		});
	});
});

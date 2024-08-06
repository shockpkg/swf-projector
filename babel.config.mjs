import {readFileSync, readdirSync} from 'node:fs';
import {deflateRawSync} from 'node:zlib';

const {name, version, engines} = JSON.parse(readFileSync('./package.json'));

const node = engines.node
	.split(/[^\d.]+/)
	.filter(s => s.length)
	.map(s => [...s.split('.').map(s => +s || 0), 0, 0].slice(0, 3))
	.sort((a, b) => a[2] - b[2])
	.sort((a, b) => a[1] - b[1])
	.sort((a, b) => a[0] - b[0])[0]
	.join('.');

const launchers = (manifest => {
	const r = {};
	for (const {name, file} of manifest) {
		r[name] = deflateRawSync(readFileSync(`launchers/data/${file}`), {
			level: 9
		}).toString('base64');
	}
	return r;
})(JSON.parse(readFileSync('./launchers/manifest.json')));

const asms = (dirs => {
	const parse = s => {
		const b = [];
		for (const line of s.split(/[\n\r]+/)) {
			const [s] = line.split(/[#;]/)[0].trim().split('  ');
			if (!s) {
				continue;
			}
			for (const h of s.split(' ')) {
				// eslint-disable-next-line unicorn/prefer-number-properties
				b.push(/^[\da-f]{2}$/i.test(h) ? parseInt(h, 16) : -1);
			}
		}
		return b;
	};
	const r = [];
	for (const dir of dirs) {
		const d = {};
		for (const f of readdirSync(dir).sort()) {
			const m = f.match(/^([^.].*)\.asm$/);
			if (m) {
				d[m[1]] = parse(readFileSync(`${dir}/${f}`, 'utf8'));
			}
		}
		r.push({
			search: `#{${dir}}`,
			replace: d
		});
	}
	return r;
})([
	'spec/asm/linux/menu-i386',
	'spec/asm/linux/menu-x86_64',
	'spec/asm/linux/offset-x86_64',
	'spec/asm/linux/patch-i386',
	'spec/asm/linux/path-i386',
	'spec/asm/linux/path-x86_64',
	'spec/asm/linux/title-i386',
	'spec/asm/linux/title-x86_64',
	'spec/asm/mac/title-i386',
	'spec/asm/mac/title-x86_64',
	'spec/asm/mac/title-arm64',
	'spec/asm/windows/ood-i386',
	'spec/asm/windows/ood-x86_64'
]);

export default api => {
	const env = api.env();
	api.cache(() => env);
	const modules = env === 'esm' ? false : 'commonjs';
	const ext = modules ? '.js' : '.mjs';
	const presets = [];
	const plugins = [];
	presets.push(
		[
			'@babel/preset-env',
			{
				modules,
				exclude: ['proposal-dynamic-import'],
				targets: {
					node
				}
			}
		],
		['@babel/preset-typescript']
	);
	plugins.push(
		[
			'module-replace',
			{
				replace: [[/^(\.\.?\/.+)\.(m|c)?tsx?$/i, `$1${ext}`]]
			}
		],
		[
			'search-and-replace',
			{
				rules: [
					{
						search: '#{NAME}',
						replace: name
					},
					{
						search: '#{VERSION}',
						replace: version
					},
					{
						search: '#{LAUNCHERS}',
						replace: launchers
					},
					...asms
				]
			}
		]
	);
	if (modules === 'commonjs') {
		plugins.push([
			'@babel/plugin-transform-modules-commonjs',
			{
				importInterop: 'node'
			}
		]);
	}
	return {
		presets,
		plugins
	};
};

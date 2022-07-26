import {mkdir, readFile, rm, writeFile} from 'fs/promises';
import {basename, dirname} from 'path';
import {pipeline} from 'stream';
import {spawn} from 'child_process';
import {promisify} from 'util';
import {deflateRaw} from 'zlib';
import {createHash} from 'crypto';

import gulp from 'gulp';
import gulpRename from 'gulp-rename';
import gulpInsert from 'gulp-insert';
import gulpFilter from 'gulp-filter';
import gulpReplace from 'gulp-replace';
import gulpSourcemaps from 'gulp-sourcemaps';
import gulpBabel from 'gulp-babel';
import {Manager} from '@shockpkg/core';

const pipe = promisify(pipeline);
const deflateRawP = promisify(deflateRaw);

// The launchers and where to download them from.
const launchers = [
	{
		name: 'windows-i686',
		url: 'https://github.com/shockpkg/projector-launcher-windows/releases/download/1.0.0/main.i686.exe',
		path: 'launchers/windows-i686.exe',
		hash: '166e5cb9228842e98e59d0cae1578fd0d97c9754944dae6533678716f7fd1c1c'
	},
	{
		name: 'windows-x86_64',
		url: 'https://github.com/shockpkg/projector-launcher-windows/releases/download/1.0.0/main.x86_64.exe',
		path: 'launchers/windows-x86_64.exe',
		hash: '6a8e15452b1049ed9727eee65e1f8c81a6ff496f7e452c75268e2c3193dd61b1'
	},
	{
		name: 'mac-app-ppc',
		url: 'https://github.com/shockpkg/projector-launcher-mac-app/releases/download/1.0.0/main.ppc',
		path: 'launchers/mac-app-ppc',
		hash: '17414c123fe82ac74a89fad9c80e36d8b612ded5a520e35f3c33eabe75a023a7'
	},
	{
		name: 'mac-app-ppc64',
		url: 'https://github.com/shockpkg/projector-launcher-mac-app/releases/download/1.0.0/main.ppc64',
		path: 'launchers/mac-app-ppc64',
		hash: '9e159161fc21b72de6fddb5fb9c60c0e34e649e4660248778219e58198adfb3d'
	},
	{
		name: 'mac-app-i386',
		url: 'https://github.com/shockpkg/projector-launcher-mac-app/releases/download/1.0.0/main.i386',
		path: 'launchers/mac-app-i386',
		hash: 'e52e19fce336130824dcfd4731bf85db7e8e96628ef8c6a49769dc5247ef6ed0'
	},
	{
		name: 'mac-app-x86_64',
		url: 'https://github.com/shockpkg/projector-launcher-mac-app/releases/download/1.0.0/main.x86_64',
		path: 'launchers/mac-app-x86_64',
		hash: 'f5b7625da819324f442cea1f3af83ea4b2bf0af1d185a7747d81b698a6168562'
	},
	{
		name: 'linux-i386',
		url: 'https://github.com/shockpkg/projector-launcher-linux/releases/download/2.0.0/main.i386',
		path: 'launchers/linux-i386',
		hash: '5bc49257a1bbe5f86a0068de0a783c669f10f88d44650e9451d3a1926277ab4c'
	},
	{
		name: 'linux-x86_64',
		url: 'https://github.com/shockpkg/projector-launcher-linux/releases/download/2.0.0/main.x86_64',
		path: 'launchers/linux-x86_64',
		hash: '4d5ae1aca3cee75732be68eec6136d5fe64c4648973123c98bb0f65492825199'
	}
];

function sha256(data: Buffer) {
	return createHash('sha256').update(data).digest().toString('hex');
}

async function downloaded(source: string, dest: string, hash: string) {
	const data = await readFile(dest).catch(_ => null);
	if (data && sha256(data) === hash) {
		return data;
	}
	await rm(dest, {force: true});
	const {default: fetch} = await import('node-fetch');
	const response = await fetch(source);
	if (response.status !== 200) {
		throw new Error(`Status ${response.status}: ${source}`);
	}
	const body = Buffer.from(await response.arrayBuffer());
	if (sha256(body) !== hash) {
		throw new Error(`Unexpected hash: ${source}`);
	}
	await mkdir(dirname(dest), {recursive: true});
	await writeFile(dest, body);
	return body;
}

function onetime<T>(f: () => T) {
	const o = {};
	let r = o;
	return () => {
		r = r === o ? f() : r;
		return r as T;
	};
}

const readLaunchers = onetime(async () => {
	const r = {};
	for (const {name, data} of await Promise.all(
		launchers.map(async ({name, path, url, hash}) =>
			downloaded(url, path, hash)
				.then(deflateRawP)
				.then(d => ({name, data: d.toString('base64')}))
		)
	)) {
		r[name] = data;
	}
	return r;
});

async function exec(
	cmd: string,
	args: string[] = [],
	env: {[e: string]: string} = {}
) {
	const code = await new Promise<number | null>((resolve, reject) => {
		const p = spawn(cmd, args, {
			stdio: 'inherit',
			shell: true,
			// eslint-disable-next-line no-process-env
			env: {...process.env, ...env}
		});
		p.once('close', resolve);
		p.once('error', reject);
	});
	if (code) {
		throw new Error(`Exit code: ${code}`);
	}
}

async function packageJson() {
	return JSON.parse(await readFile('package.json', 'utf8')) as {
		[p: string]: string;
	};
}

async function babelrc() {
	return {
		...JSON.parse(await readFile('.babelrc', 'utf8')),
		babelrc: false
	} as {
		presets: [string, unknown][];
		babelOpts: unknown[];
		plugins: unknown[];
	};
}

async function babelTarget(
	src: string[],
	dest: string,
	modules: string | boolean
) {
	const ext = modules ? '.js' : '.mjs';

	const babelOptions = await babelrc();
	for (const preset of babelOptions.presets) {
		if (preset[0] === '@babel/preset-env') {
			(preset[1] as {modules: string | boolean}).modules = modules;
		}
	}
	if (modules === 'commonjs') {
		babelOptions.plugins.push([
			'@babel/plugin-transform-modules-commonjs',
			{importInterop: 'node'}
		]);
	}
	babelOptions.plugins.push([
		'esm-resolver',
		{
			source: {
				extensions: [
					[['.js', '.mjs', '.jsx', '.mjsx', '.ts', '.tsx'], ext]
				]
			}
		}
	]);

	// Read the package JSON.
	const pkg = await packageJson();

	// Filter meta data file and create replace transform.
	const filterMeta = gulpFilter(['*/meta.ts', '*/launchers.ts'], {
		restore: true
	});
	const filterMetaReplaces = [
		["'@VERSION@'", JSON.stringify(pkg.version)],
		["'@NAME@'", JSON.stringify(pkg.name)],
		["'@LAUNCHERS@'", JSON.stringify(await readLaunchers())]
	].map(([f, r]) => gulpReplace(f, r));

	await pipe(
		gulp.src(src),
		filterMeta,
		...filterMetaReplaces,
		filterMeta.restore,
		gulpSourcemaps.init(),
		gulpBabel(babelOptions as {}),
		gulpRename(path => {
			path.extname = ext;
		}),
		gulpSourcemaps.write('.', {
			includeContent: true,
			addComment: false,
			destPath: dest
		}),
		gulpInsert.transform((code, {path}) => {
			if (path.endsWith(ext)) {
				return `${code}\n//# sourceMappingURL=${basename(path)}.map\n`;
			}
			return code;
		}),
		gulp.dest(dest)
	);
}

// clean

gulp.task('clean', async () => {
	await Promise.all([
		rm('lib', {recursive: true, force: true}),
		rm('spec/projectors', {recursive: true, force: true}),
		rm('spec/bundles', {recursive: true, force: true})
	]);
});

// lint

gulp.task('lint', async () => {
	await exec('eslint', ['.']);
});

// formatting

gulp.task('format', async () => {
	await exec('prettier', ['-w', '.']);
});

gulp.task('formatted', async () => {
	await exec('prettier', ['-c', '.']);
});

// build

gulp.task('build:dts', async () => {
	await exec('tsc');
});

gulp.task('build:cjs', async () => {
	await babelTarget(['src/**/*.ts'], 'lib', 'commonjs');
});

gulp.task('build:esm', async () => {
	await babelTarget(['src/**/*.ts'], 'lib', false);
});

gulp.task('build', gulp.parallel(['build:dts', 'build:cjs', 'build:esm']));

// test

gulp.task('test:cjs', async () => {
	const installed = await new Manager().with(async manager =>
		manager.installed()
	);
	await exec('jasmine', [], {
		SWF_PROJECTOR_INSTALLED: installed.map(p => p.name).join(',')
	});
});

gulp.task('test:esm', async () => {
	const installed = await new Manager().with(async manager =>
		manager.installed()
	);
	await exec('jasmine', ['--config=spec/support/jasmine.esm.json'], {
		SWF_PROJECTOR_INSTALLED: installed.map(p => p.name).join(',')
	});
});

gulp.task('test', gulp.series(['test:cjs', 'test:esm']));

// watch

gulp.task('watch', () => {
	gulp.watch(['src/**/*'], gulp.series(['all']));
});

gulp.task('watch:cjs', () => {
	gulp.watch(['src/**/*'], gulp.series(['all:cjs']));
});

gulp.task('watch:esm', () => {
	gulp.watch(['src/**/*'], gulp.series(['all:esm']));
});

// all

gulp.task(
	'all:cjs',
	gulp.series(['clean', 'build:cjs', 'test:cjs', 'lint', 'formatted'])
);

gulp.task(
	'all:esm',
	gulp.series(['clean', 'build:esm', 'test:esm', 'lint', 'formatted'])
);

gulp.task('all', gulp.series(['clean', 'build', 'test', 'lint', 'formatted']));

// prepack

gulp.task('prepack', gulp.series(['clean', 'build']));

// default

gulp.task('default', gulp.series(['all']));

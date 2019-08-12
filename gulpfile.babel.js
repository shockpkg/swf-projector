/* eslint import/no-extraneous-dependencies: ["error", {devDependencies: true}] */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable @typescript-eslint/promise-function-async */

import fs from 'fs';
import path from 'path';
import stream from 'stream';
import util from 'util';

import gulp from 'gulp';
import gulpRename from 'gulp-rename';
import gulpInsert from 'gulp-insert';
import gulpFilter from 'gulp-filter';
import gulpReplace from 'gulp-replace';
import gulpSourcemaps from 'gulp-sourcemaps';
import gulpBabel from 'gulp-babel';
import execa from 'execa';
import del from 'del';
import {Manager} from '@shockpkg/core'

const readFile = util.promisify(fs.readFile);
const pipeline = util.promisify(stream.pipeline);

const platformIsMac = process.platform === 'darwin';
const shockpkgWin = [
	'flash-player-3.0.8.0-windows-32bit-sa',
	'flash-player-4.0.7.0-windows-sa',
	'flash-player-5.0.30.0-windows-sa',
	'flash-player-5.0.30.0-windows-sa-debug',
	'flash-player-6.0.21.0-windows-sa',
	'flash-player-6.0.79.0-windows-sa',
	'flash-player-7.0.14.0-windows-sa',
	'flash-player-7.0.19.0-windows-sa',
	'flash-player-8.0.22.0-windows-sa',
	'flash-player-8.0.42.0-windows-sa',
	'flash-player-9.0.15.0-windows-sa-debug',
	'flash-player-9.0.115.0-windows-sa',
	'flash-player-9.0.280.0-windows-sa',
	'flash-player-9.0.289.0-windows-sa',
	'flash-player-10.0.12.36-windows-sa',
	'flash-player-10.0.45.2-windows-sa',
	'flash-player-10.3.183.90-windows-sa',
	'flash-player-11.1.102.55-windows-32bit-sa',
	'flash-player-32.0.0.223-windows-sa',
	'flash-player-32.0.0.223-windows-sa-debug'
];
const shockpkgMac = [
	'flash-player-9.0.28.0-mac-sa-debug',
	'flash-player-9.0.45.0-mac-sa-debug',
	'flash-player-9.0.115.0-mac-sa',
	'flash-player-9.0.115.0-mac-sa-debug',
	'flash-player-9.0.280.0-mac-sa',
	'flash-player-9.0.289.0-mac-sa',
	'flash-player-10.0.12.36-mac-sa',
	'flash-player-10.0.45.2-mac-sa-debug',
	'flash-player-10.1.53.64-mac-sa',
	'flash-player-10.1.102.64-mac-sa',
	'flash-player-10.2.152.26-mac-sa',
	'flash-player-10.2.153.1-mac-sa',
	'flash-player-10.2.159.1-mac-sa',
	'flash-player-10.3.181.14-mac-sa',
	'flash-player-10.3.183.90-mac-sa',
	'flash-player-11.0.1.152-mac-sa',
	'flash-player-11.1.102.55-mac-sa',
	'flash-player-15.0.0.152-mac-sa-debug',
	'flash-player-15.0.0.189-mac-sa-debug',
	'flash-player-32.0.0.223-mac-sa',
	'flash-player-32.0.0.223-mac-sa-debug'
];
const shockpkgLin = [
	'flash-player-6.0.79.0-linux-sa',
	'flash-player-9.0.115.0-linux-sa',
	'flash-player-9.0.115.0-linux-sa-debug',
	'flash-player-9.0.280.0-linux-sa',
	'flash-player-9.0.289.0-linux-sa',
	'flash-player-10.0.12.36-linux-sa',
	'flash-player-10.3.183.90-linux-sa',
	'flash-player-11.0.1.152-linux-i386-sa',
	'flash-player-11.0.1.152-linux-i386-sa-debug',
	'flash-player-11.1.102.55-linux-i386-sa',
	'flash-player-11.2.202.644-linux-i386-sa',
	'flash-player-11.2.202.644-linux-i386-sa-debug',
	'flash-player-24.0.0.186-linux-x86_64-sa',
	'flash-player-24.0.0.186-linux-x86_64-sa-debug',
	'flash-player-24.0.0.194-linux-x86_64-sa',
	'flash-player-24.0.0.194-linux-x86_64-sa-debug',
	'flash-player-24.0.0.221-linux-x86_64-sa',
	'flash-player-24.0.0.221-linux-x86_64-sa-debug',
	'flash-player-25.0.0.127-linux-x86_64-sa',
	'flash-player-25.0.0.127-linux-x86_64-sa-debug',
	'flash-player-25.0.0.148-linux-x86_64-sa',
	'flash-player-25.0.0.148-linux-x86_64-sa-debug',
	'flash-player-25.0.0.171-linux-x86_64-sa',
	'flash-player-25.0.0.171-linux-x86_64-sa-debug',
	'flash-player-26.0.0.126-linux-x86_64-sa',
	'flash-player-26.0.0.126-linux-x86_64-sa-debug',
	'flash-player-26.0.0.131-linux-x86_64-sa',
	'flash-player-26.0.0.131-linux-x86_64-sa-debug',
	'flash-player-26.0.0.137-linux-x86_64-sa',
	'flash-player-26.0.0.137-linux-x86_64-sa-debug',
	'flash-player-26.0.0.151-linux-x86_64-sa',
	'flash-player-26.0.0.151-linux-x86_64-sa-debug',
	'flash-player-27.0.0.130-linux-x86_64-sa',
	'flash-player-27.0.0.130-linux-x86_64-sa-debug',
	'flash-player-27.0.0.159-linux-x86_64-sa',
	'flash-player-27.0.0.159-linux-x86_64-sa-debug',
	'flash-player-27.0.0.170-linux-x86_64-sa',
	'flash-player-27.0.0.170-linux-x86_64-sa-debug',
	'flash-player-27.0.0.183-linux-x86_64-sa',
	'flash-player-27.0.0.183-linux-x86_64-sa-debug',
	'flash-player-27.0.0.187-linux-x86_64-sa',
	'flash-player-27.0.0.187-linux-x86_64-sa-debug',
	'flash-player-28.0.0.126-linux-x86_64-sa',
	'flash-player-28.0.0.126-linux-x86_64-sa-debug',
	'flash-player-28.0.0.137-linux-x86_64-sa',
	'flash-player-28.0.0.137-linux-x86_64-sa-debug',
	'flash-player-28.0.0.161-linux-x86_64-sa',
	'flash-player-28.0.0.161-linux-x86_64-sa-debug',
	'flash-player-29.0.0.113-linux-x86_64-sa',
	'flash-player-29.0.0.113-linux-x86_64-sa-debug',
	'flash-player-29.0.0.140-linux-x86_64-sa',
	'flash-player-29.0.0.140-linux-x86_64-sa-debug',
	'flash-player-29.0.0.171-linux-x86_64-sa',
	'flash-player-29.0.0.171-linux-x86_64-sa-debug',
	'flash-player-30.0.0.113-linux-x86_64-sa',
	'flash-player-30.0.0.113-linux-x86_64-sa-debug',
	'flash-player-30.0.0.134-linux-x86_64-sa',
	'flash-player-30.0.0.134-linux-x86_64-sa-debug',
	'flash-player-30.0.0.154-linux-x86_64-sa',
	'flash-player-30.0.0.154-linux-x86_64-sa-debug',
	'flash-player-31.0.0.108-linux-x86_64-sa',
	'flash-player-31.0.0.108-linux-x86_64-sa-debug',
	'flash-player-31.0.0.122-linux-x86_64-sa',
	'flash-player-31.0.0.122-linux-x86_64-sa-debug',
	'flash-player-31.0.0.148-linux-x86_64-sa',
	'flash-player-31.0.0.148-linux-x86_64-sa-debug',
	'flash-player-31.0.0.153-linux-x86_64-sa',
	'flash-player-31.0.0.153-linux-x86_64-sa-debug',
	'flash-player-32.0.0.101-linux-x86_64-sa',
	'flash-player-32.0.0.101-linux-x86_64-sa-debug',
	'flash-player-32.0.0.114-linux-x86_64-sa',
	'flash-player-32.0.0.114-linux-x86_64-sa-debug',
	'flash-player-32.0.0.142-linux-x86_64-sa',
	'flash-player-32.0.0.142-linux-x86_64-sa-debug',
	'flash-player-32.0.0.156-linux-x86_64-sa',
	'flash-player-32.0.0.156-linux-x86_64-sa-debug',
	'flash-player-32.0.0.171-linux-x86_64-sa',
	'flash-player-32.0.0.171-linux-x86_64-sa-debug',
	'flash-player-32.0.0.192-linux-x86_64-sa',
	'flash-player-32.0.0.192-linux-x86_64-sa-debug',
	'flash-player-32.0.0.207-linux-x86_64-sa',
	'flash-player-32.0.0.207-linux-x86_64-sa-debug',
	'flash-player-32.0.0.223-linux-x86_64-sa',
	'flash-player-32.0.0.223-linux-x86_64-sa-debug'
];

async function exec(cmd, args = []) {
	await execa(cmd, args, {
		preferLocal: true,
		stdio: 'inherit'
	});
}

async function packageJSON() {
	packageJSON.json = packageJSON.json || readFile('package.json', 'utf8');
	return JSON.parse(await packageJSON.json);
}

async function babelrc() {
	babelrc.json = babelrc.json || readFile('.babelrc', 'utf8');
	return Object.assign(JSON.parse(await babelrc.json), {
		babelrc: false
	});
}

async function babelTarget(src, srcOpts, dest, modules) {
	// Change module.
	const babelOptions = await babelrc();
	for (const preset of babelOptions.presets) {
		if (preset[0] === '@babel/preset-env') {
			preset[1].modules = modules;
		}
	}
	if (!modules) {
		babelOptions.plugins.push([
			'esm-resolver', {
				source: {
					extensions: [
						[
							['.js', '.mjs', '.jsx', '.mjsx', '.ts', '.tsx'],
							'.mjs'
						]
					]
				},
				submodule: {
					extensions: ['.mjs', '.js']
				},
				module: {
					entry: [
						{
							type: 'file',
							path: './module',
							extensions: ['.mjs', '.js']
						}
					]
				}
			}
		]);
	}

	// Read the package JSON.
	const pkg = await packageJSON();

	// Filter meta data file and create replace transform.
	const filterMeta = gulpFilter(['*/meta.ts'], {restore: true});
	const filterMetaReplaces = [
		["'@VERSION@'", JSON.stringify(pkg.version)],
		["'@NAME@'", JSON.stringify(pkg.name)]
	].map(v => gulpReplace(...v));

	await pipeline(...[
		gulp.src(src, srcOpts),
		filterMeta,
		...filterMetaReplaces,
		filterMeta.restore,
		gulpSourcemaps.init(),
		gulpBabel(babelOptions),
		gulpRename(path => {
			if (!modules && path.extname === '.js') {
				path.extname = '.mjs';
			}
		}),
		gulpSourcemaps.write('.', {
			includeContent: true,
			addComment: false,
			destPath: dest
		}),
		gulpInsert.transform((contents, file) => {
			// Manually append sourcemap comment.
			if (/\.m?js$/i.test(file.path)) {
				const base = path.basename(file.path);
				return `${contents}\n//# sourceMappingURL=${base}.map\n`;
			}
			return contents;
		}),
		gulp.dest(dest)
	].filter(Boolean));
}

async function eslint(strict) {
	try {
		await exec('eslint', ['--ext', 'js,mjs,jsx,mjsx,ts,tsx', '.']);
	}
	catch (err) {
		if (strict) {
			throw err;
		}
	}
}

// clean

gulp.task('clean:logs', async () => {
	await del([
		'npm-debug.log*',
		'yarn-debug.log*',
		'yarn-error.log*'
	]);
});

gulp.task('clean:lib', async () => {
	await del([
		'lib'
	]);
});

gulp.task('clean:projectors', async () => {
	await del([
		'spec/projectors'
	]);
});

gulp.task('clean', gulp.parallel([
	'clean:logs',
	'clean:lib',
	'clean:projectors'
]));

// lint (watch)

gulp.task('lintw:es', async () => {
	await eslint(false);
});

gulp.task('lintw', gulp.parallel([
	'lintw:es'
]));

// lint

gulp.task('lint:es', async () => {
	await eslint(true);
});

gulp.task('lint', gulp.parallel([
	'lint:es'
]));

// build

gulp.task('build:lib:dts', async () => {
	await exec('tsc');
});

gulp.task('build:lib:cjs', async () => {
	await babelTarget(['src/**/*.ts'], {}, 'lib', 'commonjs');
});

gulp.task('build:lib:mjs', async () => {
	await babelTarget(['src/**/*.ts'], {}, 'lib', false);
});

gulp.task('build:lib', gulp.parallel([
	'build:lib:dts',
	'build:lib:cjs',
	'build:lib:mjs'
]));

gulp.task('build', gulp.parallel([
	'build:lib'
]));

// test

gulp.task('test:node', async () => {
	await exec('jasmine');
});

gulp.task('test', gulp.parallel([
	'test:node'
]));

// all

gulp.task('all', gulp.series([
	'clean',
	'lint',
	'build',
	'test'
]));

// watched

gulp.task('watched', gulp.series([
	'clean',
	'lintw',
	'build',
	'test'
]));

// shockpkg-install

gulp.task('shockpkg-install', async () => {
	await exec('shockpkg', ['update']);
	await exec('shockpkg', [
		'install',
		...shockpkgWin,
		...shockpkgMac,
		...shockpkgLin
	]);
});

gulp.task('shockpkg-install-ci', async () => {
	await exec('shockpkg', ['update']);
	await exec('shockpkg', [
		'install',
		...shockpkgWin,
		...(platformIsMac ? shockpkgMac : []),
		...shockpkgLin
	]);
});

async function installFull(list) {
	await exec('shockpkg', [
		'install-full',
		...list
	]);
	const keep = new Set(list);
	const remove = new Set();
	const manager = new Manager();
	await manager.with(async manager => {
		for (const entry of list) {
			const pkg = manager.packageByUnique(entry);
			for (let p = pkg.parent; p; p = p.parent) {
				if (keep.has(p.name) || keep.has(p.sha256)) {
					continue;
				}
				remove.add(p.name);
			}
		}
	});
	await exec('shockpkg', [
		'remove',
		...remove
	]);
}

gulp.task('shockpkg-install-full', async () => {
	await exec('shockpkg', ['update']);
	await installFull([
		...shockpkgWin,
		...shockpkgMac,
		...shockpkgLin
	]);
});

gulp.task('shockpkg-install-full-ci', async () => {
	await exec('shockpkg', ['update']);
	await installFull([
		...shockpkgWin,
		...(platformIsMac ? shockpkgMac : []),
		...shockpkgLin
	]);
});

// prepack

gulp.task('prepack', gulp.series([
	'clean',
	'build'
]));

// default

gulp.task('default', gulp.series([
	'all'
]));

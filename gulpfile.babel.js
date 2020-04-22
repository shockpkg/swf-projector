import path from 'path';
import stream from 'stream';
import util from 'util';
import crypto from 'crypto';

import gulp from 'gulp';
import gulpRename from 'gulp-rename';
import gulpInsert from 'gulp-insert';
import gulpFilter from 'gulp-filter';
import gulpReplace from 'gulp-replace';
import gulpSourcemaps from 'gulp-sourcemaps';
import gulpBabel from 'gulp-babel';
import execa from 'execa';
import del from 'del';
import fse from 'fs-extra';
import onetime from 'onetime';
import download from 'download';

const pipeline = util.promisify(stream.pipeline);

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
		name: 'mac-app-ppc970',
		url: 'https://github.com/shockpkg/projector-launcher-mac-app/releases/download/1.0.0/main.ppc970',
		path: 'launchers/mac-app-ppc970',
		hash: 'fbfeb7e2c557e434771268a8a260852cd0b80c74e39a7054e867cac24ff2257a'
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
		name: 'linux',
		url: 'https://github.com/shockpkg/projector-launcher-linux/releases/download/1.0.0/main',
		path: 'launchers/linux',
		hash: '77c185db228b0120cb9b1e7780110c4947e4f588c414193648a5bbf0513ee0f4'
	}
];

async function hashFile(file, algo) {
	const hash = crypto.createHash(algo).setEncoding('hex');
	await pipeline(fse.createReadStream(file), hash);
	return hash.read().toLowerCase();
}

async function downloaded(source, dest, hash) {
	const exists = await fse.pathExists(dest);
	if (exists && await hashFile(dest, 'sha256') === hash) {
		return dest;
	}
	await fse.remove(dest);
	const part = `${dest}.part`;
	await fse.remove(part);
	await download(source, path.dirname(part), {
		filename: path.basename(part)
	});
	if (await hashFile(part, 'sha256') !== hash) {
		await fse.remove(path);
		throw new Error('Downloaded file has an unexpected hash');
	}
	await fse.rename(part, dest);
	return dest;
}

const ensureLaunchers = onetime(async () => Promise.all(
	launchers.map(async o => downloaded(o.url, o.path, o.hash))
));

async function exec(cmd, args = []) {
	await execa(cmd, args, {
		preferLocal: true,
		stdio: 'inherit'
	});
}

const packageJson = onetime(async () => fse.readFile('package.json', 'utf8'));

const babelrc = onetime(async () => fse.readFile('.babelrc', 'utf8'));

async function babelTarget(src, srcOpts, dest, modules) {
	await ensureLaunchers();

	// Change module.
	const babelOptions = {...JSON.parse(await babelrc()), babelrc: false};
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
	const pkg = JSON.parse(await packageJson());

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

// prepack

gulp.task('prepack', gulp.series([
	'clean',
	'build'
]));

// default

gulp.task('default', gulp.series([
	'all'
]));

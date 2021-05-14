import path from 'path';
import stream from 'stream';
import util from 'util';
import zlib from 'zlib';
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
import download from 'download';

const pipeline = util.promisify(stream.pipeline);
const deflateRaw = util.promisify(zlib.deflateRaw);

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

async function hashFile(file: string, algo: string) {
	const hash = crypto.createHash(algo).setEncoding('hex');
	await pipeline(fse.createReadStream(file), hash);
	return hash.read().toLowerCase();
}

async function downloaded(source: string, dest: string, hash: string) {
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
		await fse.remove(part);
		throw new Error('Downloaded file has an unexpected hash');
	}
	await fse.rename(part, dest);
	return dest;
}

function onetime<T>(f: () => T) {
	const o = {};
	let r = o;
	return () => {
		r = r === o ? f() : r;
		return r as T;
	};
}

const ensureLaunchers = onetime(async () => Promise.all(
	launchers.map(async o => downloaded(o.url, o.path, o.hash))
));

async function exec(cmd: string, args: string[] = []) {
	await execa(cmd, args, {
		preferLocal: true,
		stdio: 'inherit'
	});
}

async function packageJSON() {
	return JSON.parse(await fse.readFile('package.json', 'utf8'));
}

async function babelrc() {
	return {
		...JSON.parse(await fse.readFile('.babelrc', 'utf8')),
		babelrc: false
	};
}

async function babelTarget(
	src: string[],
	srcOpts: any,
	dest: string,
	modules: string | boolean
) {
	await ensureLaunchers();

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
				}
			}
		]);
	}

	// Read the package JSON.
	const pkg = await packageJSON();

	const launchersData = {};
	for (const {name, path} of launchers) {
		// eslint-disable-next-line no-await-in-loop
		launchersData[name] = (await deflateRaw(await fse.readFile(path)))
			.toString('base64');
	}

	// Filter meta data file and create replace transform.
	const filterMeta = gulpFilter([
		'*/meta.ts',
		'*/launchers.ts'
	], {restore: true});
	const filterMetaReplaces = [
		["'@VERSION@'", JSON.stringify(pkg.version)],
		["'@NAME@'", JSON.stringify(pkg.name)],
		["'@LAUNCHERS@'", JSON.stringify(launchersData)]
	].map(([f, r]) => gulpReplace(f, r));

	await pipeline(
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
	);
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

gulp.task('clean:bundles', async () => {
	await del([
		'spec/bundles'
	]);
});

gulp.task('clean', gulp.parallel([
	'clean:logs',
	'clean:lib',
	'clean:projectors',
	'clean:bundles'
]));

// lint

gulp.task('lint:es', async () => {
	await exec('eslint', ['.']);
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

// watch

gulp.task('watch', () => {
	gulp.watch([
		'src/**/*'
	], gulp.series([
		'all'
	]));
});

// all

gulp.task('all', gulp.series([
	'clean',
	'build',
	'test',
	'lint'
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

# swf-projector

Package for creating Flash Player projectors

[![npm](https://img.shields.io/npm/v/@shockpkg/swf-projector.svg)](https://npmjs.com/package/@shockpkg/swf-projector)
[![node](https://img.shields.io/node/v/@shockpkg/swf-projector.svg)](https://nodejs.org)

[![dependencies](https://david-dm.org/shockpkg/swf-projector.svg)](https://david-dm.org/shockpkg/swf-projector)
[![size](https://packagephobia.now.sh/badge?p=@shockpkg/swf-projector)](https://packagephobia.now.sh/result?p=@shockpkg/swf-projector)
[![downloads](https://img.shields.io/npm/dm/@shockpkg/swf-projector.svg)](https://npmcharts.com/compare/@shockpkg/swf-projector?minimal=true)

[![travis-ci](https://travis-ci.org/shockpkg/swf-projector.svg?branch=master)](https://travis-ci.org/shockpkg/swf-projector)


# Overview

Creates Flash projectors from a standalone Flash Player.

Takes a standalone Flash Player file, a directory containing a standalone Flash Player, or a shockpkg standalone Flash Player package file.

Certain features may only work on certain platforms.

Reading DMG projector packages and removing Mac APP code signatures is only supported on MacOS.

Features that modify Windows EXE resources requires either Windows or Wine in the path.


# Usage

## Basic Usage

### Windows

```js
import {ProjectorWindows} from '@shockpkg/swf-projector';

async function main() {
	const projector = new ProjectorWindows({
		player: 'player.zip',
		movieFile: 'movie.swf'
	});
	projector.write('out-dir-windows', 'application.exe');
}
main().catch(err => {
	process.exitCode = 1;
	console.error(err);
});
```

### Mac App

```js
import {ProjectorMacApp} from '@shockpkg/swf-projector';

async function main() {
	const projector = new ProjectorMacApp({
		player: 'player.dmg',
		movieFile: 'movie.swf'
	});
	projector.write('out-dir-macapp', 'application.app');
}
main().catch(err => {
	process.exitCode = 1;
	console.error(err);
});
```

### Linux 32-bit

```js
import {ProjectorLinux} from '@shockpkg/swf-projector';

async function main() {
	const projector = new ProjectorLinux({
		player: 'player.tar.gz',
		movieFile: 'movie.swf'
	});
	projector.write('out-dir-linux', 'application');
}
main().catch(err => {
	process.exitCode = 1;
	console.error(err);
});
```

### Linux 64-bit

```js
import {ProjectorLinux} from '@shockpkg/swf-projector';

async function main() {
	const projector = new ProjectorLinux({
		player: 'player.tar.gz',
		movieFile: 'movie.swf',
		patchProjectorOffset: true // Necessary unless the binaries get fixed.
	});
	projector.write('out-dir-linux64', 'application');
}
main().catch(err => {
	process.exitCode = 1;
	console.error(err);
});
```


# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.


# License

Copyright (c) 2019 JrMasterModelBuilder

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.

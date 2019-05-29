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

Unfortunately, the newer 64-bit Linux Flash Players do not support projectors, see notes below for some options.


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

### Linux

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


# Linux Notes

Unfortunately, the newer 64-bit standalone Flash Players 24+ do not support the projector functionality.

As an alternative, it's possible to open a specific SWF file in a standalone Flash Player by passing the file path as an argument, perhaps with a wrapper script.

```sh
#!/bin/sh

./flashplayer movie.swf
```

Additionally, if you omit the `movieFile` parameter to `ProjectorLinux`, you can write a plain standalone Flash Player, without making it into a projector (convenient for use with shockpkg pacakges).

Unfortunately, the URL bar will remain, and the SWF will not have the extra privileges a proper projector gets (like fscommand exec).


# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.


# License

Copyright (c) 2019 JrMasterModelBuilder

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.

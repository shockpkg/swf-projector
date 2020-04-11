# swf-projector

Package for creating Flash Player projectors

[![npm](https://img.shields.io/npm/v/@shockpkg/swf-projector.svg)](https://npmjs.com/package/@shockpkg/swf-projector)
[![node](https://img.shields.io/node/v/@shockpkg/swf-projector.svg)](https://nodejs.org)

[![dependencies](https://david-dm.org/shockpkg/swf-projector.svg)](https://david-dm.org/shockpkg/swf-projector)
[![size](https://packagephobia.now.sh/badge?p=@shockpkg/swf-projector)](https://packagephobia.now.sh/result?p=@shockpkg/swf-projector)
[![downloads](https://img.shields.io/npm/dm/@shockpkg/swf-projector.svg)](https://npmcharts.com/compare/@shockpkg/swf-projector?minimal=true)

[![travis-ci](https://travis-ci.com/shockpkg/swf-projector.svg?branch=master)](https://travis-ci.com/shockpkg/swf-projector)


# Overview

Creates Flash projectors from a standalone Flash Player.

Takes a standalone Flash Player file, a directory containing a standalone Flash Player, or a shockpkg standalone Flash Player package file.

Reading DMG projector packages is only supported on macOS.


# Usage

## Basic Usage

### Windows

```js
import {ProjectorWindows} from '@shockpkg/swf-projector';

async function main() {
	const projector = new ProjectorWindows({
		player: 'player.zip',
		movieFile: 'movie.swf',
		iconFile: 'icon.ico', // Optional custom icon.
		fileVersion: '3.1.4', // Optional custom PE resource data.
		productVersion: '3.1.4', // Optional custom PE resource data.
		versionStrings: { // Optional custom PE resource data.
			CompanyName: 'Custom Company Name',
			FileDescription: 'Custom File Description',
			LegalCopyright: 'Custom Legal Copyright',
			ProductName: 'Custom Product Name',
			LegalTrademarks: 'Custom Legal Trademarks',
			OriginalFilename: 'CustomOriginalFilename.exe',
			InternalName: 'CustomInternalName',
			Comments: 'Custom Comments'
		},
		removeCodeSignature: true // Optionally remove now-broken signature.
	});
	await projector.write('out-dir-windows', 'application.exe');
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
		movieFile: 'movie.swf',
		iconFile: 'icon.icns', // Optional custom icon.
		binaryName: 'application', // Optionally change main binary name.
		infoPlistFile: 'Info.plist', // Optionally base Info.plist file.
		pkgInfoFile: 'PkgInfo', // Optionally custom PkgInfo file.
		updateBundleName: true, // Optionally update bundle name.
		removeFileAssociations: true, // Optionally remove file associations.
		removeCodeSignature: true // Optionally remove now-broken signature.
	});
	await projector.write('out-dir-macapp', 'application.app');
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
		movieFile: 'movie.swf',
		patchWindowTitle: 'Custom Title',
		// patchMenuRemove: true, // Optionally disable menu entirely.
		patchProjectorPath: true // Necessary to load from relative paths.
	});
	await projector.write('out-dir-linux', 'application');
}
main().catch(err => {
	process.exitCode = 1;
	console.error(err);
});
```

### Linux 64-bit

```js
import {ProjectorLinux64} from '@shockpkg/swf-projector';

async function main() {
	const projector = new ProjectorLinux64({
		player: 'player.tar.gz',
		movieFile: 'movie.swf',
		patchWindowTitle: 'Custom Title',
		// patchMenuRemove: true, // Optionally disable menu entirely.
		patchProjectorPath: true, // Necessary to load from relative paths.
		patchProjectorOffset: true // Necessary unless the binaries get fixed.
	});
	await projector.write('out-dir-linux64', 'application');
}
main().catch(err => {
	process.exitCode = 1;
	console.error(err);
});
```

# Notes

## Linux

### Option: `patchWindowTitle`

An option to replace the window title stored in the binary. Size cannot be larger than the title being replaced in the binary.

### Option: `patchMenuRemove`

An option to completely disable the menu for the projector. Avoids layout calculation issues when the menu is in the window.

### Option: `patchProjectorPath`

Compatible with Flash Player 9+ (version 6 was correct).

Required since Flash Player 10.1+ to load relative paths (earlier versions would try the relative path first, before trying resolved path).

Projectors create the main URL with: `"file:" + argv[0]` resolving to a bad URL like `file://file|%2Fpath%2Fto%2Fapplication` causing relative paths to load from the root of the drive.

This patch replaces the string reference to use `"file://" + argv[0]` instead, which resolves to `file:///path/to/application` when run by an absolute path.

Not a perfect patch because it does not resolve the full path first, if run from relative path would get path like `file://./application`, but an improvement. Recommended to use a shell script that resolves itself and runs projector from an absolute path (see example script below).

### Option: `patchProjectorOffset`

The Linux projector reading code was never updated for 64-bit ELF compatibility. This patch fixes reading projector data in 64-bit Linux projectors.

### Example Self-Resolving Shell Script:

```sh
#!/bin/sh

# Self path.
__self="$0"
if [ ! -f "$__self" ]; then
	__self="`which "$__self"`"
fi

# Resolve symlinks.
while [ -h "$__self" ]; do
	__file="`readlink "$__self"`"
	case "$__file" in
	/*)
		__self="$__file"
		;;
	*)
		__self="`dirname "$__self"`/$__file"
		;;
	esac
done

# Assemble paths.
__dir="`dirname "$__self"`"
__dir="`cd "$__dir" > /dev/null && pwd`"
__file="$__dir/`basename "$__self"`"

# Run projector.
"$__dir/projector"
```


# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.


# License

Copyright (c) 2019-2020 JrMasterModelBuilder

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.

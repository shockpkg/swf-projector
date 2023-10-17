# SWF Projector

Package for creating Flash Player projectors

[![npm](https://img.shields.io/npm/v/@shockpkg/swf-projector.svg)](https://npmjs.com/package/@shockpkg/swf-projector)
[![node](https://img.shields.io/node/v/@shockpkg/swf-projector.svg)](https://nodejs.org)

[![size](https://packagephobia.now.sh/badge?p=@shockpkg/swf-projector)](https://packagephobia.now.sh/result?p=@shockpkg/swf-projector)
[![downloads](https://img.shields.io/npm/dm/@shockpkg/swf-projector.svg)](https://npmcharts.com/compare/@shockpkg/swf-projector?minimal=true)

[![Build Status](https://github.com/shockpkg/swf-projector/workflows/main/badge.svg?branch=master)](https://github.com/shockpkg/swf-projector/actions?query=workflow%3Amain+branch%3Amaster)

# Overview

Creates Flash projectors from a standalone Flash Player.

Takes a standalone Flash Player file, a directory containing a standalone Flash Player, or a shockpkg standalone Flash Player package file.

Can also create bundles that group the projector and resources in a directory beside a single launcher for Windows and Linux or within an application bundle for macOS.

Reading DMG projector packages is only supported on macOS.

# Usage

## Projector

### Windows

```js
import {ProjectorWindows} from '@shockpkg/swf-projector';

const projector = new ProjectorWindows('projector-windows/application.exe');

// Required player.
projector.player = 'player.exe';

// The movie.
projector.movieFile = 'movie.swf';

// Optional custom icon.
projector.iconFile = 'icon.ico';

// Optional custom PE resource strings.
projector.versionStrings = {
	FileVersion: '1.2.3.4',
	ProductVersion: '1.2.3.4',
	CompanyName: 'Custom Company Name',
	FileDescription: 'Custom File Description',
	LegalCopyright: 'Custom Legal Copyright',
	ProductName: 'Custom Product Name',
	LegalTrademarks: 'Custom Legal Trademarks',
	OriginalFilename: 'CustomOriginalFilename.exe',
	InternalName: 'CustomInternalName',
	Comments: 'Custom Comments'
};

// Optionally patch window title.
projector.patchWindowTitle = 'Custom Title';

// Optionally remove now-broken signature.
projector.removeCodeSignature = true;

// Optionally remove out-of-date check.
projector.patchOutOfDateDisable = true;

await projector.write();
```

### Mac

```js
import {ProjectorMac} from '@shockpkg/swf-projector';

const projector = new ProjectorMac('projector-mac/application.app');

// Required player.
projector.player = 'player.zip';

// The movie.
projector.movieFile = 'movie.swf';

// Optional custom icon.
projector.iconFile = 'icon.icns';

// Optionally change main binary name.
projector.binaryName = 'application';

// Optionally base Info.plist file.
projector.infoPlistFile = 'Info.plist';

// Optionally custom PkgInfo file.
projector.pkgInfoFile = 'PkgInfo';

// Optionally update bundle name.
projector.bundleName = 'application';

// Optionally patch window title (currently requires version 11+).
projector.patchWindowTitle = 'Custom Title';

// Optionally remove file associations from Info.plist.
projector.removeFileAssociations = true;

// Optionally exclude InfoPlist.strings files.
projector.removeInfoPlistStrings = true;

// Optionally remove now-broken signature.
projector.removeCodeSignature = true;

await projector.write();
```

### Linux

```js
import {ProjectorLinux} from '@shockpkg/swf-projector';

const projector = new ProjectorLinux('projector-linux/application');

// Required player.
projector.player = 'player.tar.gz';

// The movie.
projector.movieFile = 'movie.swf';

// Optionally patch window title.
projector.patchWindowTitle = 'Custom Title';

// Optionally disable menu entirely.
// projector.patchMenuRemove = true;

// Necessary to load from relative paths.
projector.patchProjectorPath = true;

// Only for 64-bit Linux, where this is necessary.
projector.patchProjectorOffset = true;

await projector.write();
```

## Bundle

### Windows

```js
import {BundleWindows} from '@shockpkg/swf-projector';

const bundle = new BundleWindows('bundle-windows/application.exe');

// Use projector property to set options.
bundle.projector.player = 'player.exe';
bundle.projector.movie = 'movie.swf';
bundle.projector.removeCodeSignature = true;
bundle.projector.patchOutOfDateDisable = true;

await bundle.write(async b => {
	// Add resources in callback.
	await b.copyResource('other.swf', 'other.swf');
});
```

### Mac

```js
import {BundleMac} from '@shockpkg/swf-projector';

const bundle = new BundleMac('bundle-mac/application.app');

// Use projector property to set options.
bundle.projector.player = 'player.zip';
bundle.projector.movie = 'movie.swf';
bundle.projector.removeCodeSignature = true;

await bundle.write(async b => {
	// Add resources in callback.
	await b.copyResource('other.swf', 'other.swf');
});
```

### Linux

```js
import {BundleLinux} from '@shockpkg/swf-projector';

const bundle = new BundleLinux('bundle-linux/application');

// Use projector property to set options.
bundle.projector.player = 'player.tar.gz';
bundle.projector.movie = 'movie.swf';
bundle.projector.patchProjectorPath = true;
bundle.projector.patchProjectorOffset = true;

await bundle.write(async b => {
	// Add resources in callback.
	await b.copyResource('other.swf', 'other.swf');
});
```

## Loader Generator

To make it easier to create a SWF that loads another URL for use in a projector, there's a `loader` utility function which generates an ASVM1 stub which loads another URL into level 0 (effectively replacing the content).

You can also specify a number of frames to delay loading the other movie, to give the player a chance to initialize before loading the other movie. This is especially useful on Linux where the player may take about 0.25s to finish resizing the window and may not finish with the correct size (mainly depending on the desktop environment's use of the menu bar). Loading another movie into level 0 after the initial resize is done will however correct the issue. Waiting 0.5s (or FPS / 2) should offer enough of a buffer.

### SWF8 600x400 30fps white movie that loads `other.swf?param=1`

```js
import {loader} from '@shockpkg/swf-projector';

const swfData = loader(8, 600, 400, 30, 0xffffff, 'other.swf?param=1');
```

### SWF8 600x400 30fps red movie that loads `other.swf`, 0.5s delay

```js
import {loader} from '@shockpkg/swf-projector';

const swfData = loader(8, 600, 400, 30, 0xff0000, 'other.swf', 30 / 2);
```

# Notes

## Windows

### Option: `patchWindowTitle`

An option to replace the window title stored in the binary (no length limit since library version 3).

### Option: `patchOutOfDateDisable`

An option to disable the out-of-date check present since version 30 and active (with 90 and 180 day defaults) since version 35.

## Mac

### Option: `patchWindowTitle`

An option to set a custom window title in the binary (no length limit since library version 3).

## Linux

### Option: `patchWindowTitle`

An option to replace the window title stored in the binary (no length limit since library version 3).

### Option: `patchMenuRemove`

An option to completely disable the menu for the projector.

### Option: `patchProjectorPath`

Required in Flash Player 6 and Flash Player 10.1+ to load relative paths (other versions would try the relative path first, before trying resolved path).

Projectors version 9+ create the main URL with: `"file:" + argv[0]` resolving to a bad URL like `file://file|%2Fpath%2Fto%2Fapplication` causing relative paths to load from the root of the drive. For such projectors this patch replaces the string reference to use `"file://" + argv[0]` instead, which resolves to `file:///path/to/application` when run by an absolute path.

Projector version 6 would use the current working directory for the main URL, causing relative paths to start in the directory above the. For such projectors this patch replaces the directory string reference to use `argv[0]` instead.

Not a perfect patch because it does not resolve the full path first, if run from relative path would get path like `file://./application`, but an improvement. Recommended to use a shell script or binary that resolves itself and runs projector from an absolute path. Using a Bundle does this automatically.

### Option: `patchProjectorOffset`

The Linux projector reading code was never updated for 64-bit ELF compatibility. This patch fixes reading projector data in 64-bit Linux projectors.

# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.

# License

Copyright (c) 2019-2023 JrMasterModelBuilder

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.

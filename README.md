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

### Windows 32-bit

```js
import {ProjectorWindows32} from '@shockpkg/swf-projector';

const projector = new ProjectorWindows32('projector-windows32/application.exe');

// Optional custom icon.
projector.iconFile = 'icon.ico';

// Optional custom PE resource strings.
projector.versionStrings = {
	FileVersion: '3.1.4',
	ProductVersion: '3.1.4',
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

await projector.withFile('player.exe', 'movie.swf');
```

### Windows 64-bit

```js
import {ProjectorWindows64} from '@shockpkg/swf-projector';

const projector = new ProjectorWindows64('projector-windows64/application.exe');

// Optional custom icon.
projector.iconFile = 'icon.ico';

// Optional custom PE resource strings.
projector.versionStrings = {
	FileVersion: '3.1.4',
	ProductVersion: '3.1.4',
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

await projector.withFile('player.exe', 'movie.swf');
```

### Mac App

```js
import {ProjectorMacApp} from '@shockpkg/swf-projector';

const projector = new ProjectorMacApp('projector-macapp/application.app');

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

await projector.withFile('player.dmg', 'movie.swf');
```

### Linux 32-bit

```js
import {ProjectorLinux32} from '@shockpkg/swf-projector';

const projector = new ProjectorLinux32('projector-linux32/application');

// Optionally patch window title.
projector.patchWindowTitle = 'Custom Title';

// Optionally disable menu entirely.
// projector.patchMenuRemove = true;

// Necessary to load from relative paths.
projector.patchProjectorPath = true;

await projector.withFile('player.tar.gz', 'movie.swf');
```

### Linux 64-bit

```js
import {ProjectorLinux64} from '@shockpkg/swf-projector';

const projector = new ProjectorLinux64('projector-linux64/application');

// Optionally patch window title.
projector.patchWindowTitle = 'Custom Title';

// Optionally disable menu entirely.
// projector.patchMenuRemove = true;

// Necessary to load from relative paths.
projector.patchProjectorPath = true;

// Necessary unless the binaries get fixed.
projector.patchProjectorOffset = true;

await projector.withFile('player.tar.gz', 'movie.swf');
```

## Bundle

### Windows 32-bit

```js
import {BundleWindows32} from '@shockpkg/swf-projector';

const bundle = new BundleWindows32('bundle-windows32/application.exe');

// Use projector property to set options.
bundle.projector.removeCodeSignature = true;
bundle.projector.patchOutOfDateDisable = true;

await bundle.withFile('player.exe', 'movie.swf', async b => {
	// Add resources in callback.
	await b.copyResource('other.swf', 'other.swf');
});
```

### Windows 64-bit

```js
import {BundleWindows64} from '@shockpkg/swf-projector';

const bundle = new BundleWindows64('bundle-windows64/application.exe');

// Use projector property to set options.
bundle.projector.removeCodeSignature = true;
bundle.projector.patchOutOfDateDisable = true;

await bundle.withFile('player.exe', 'movie.swf', async b => {
	// Add resources in callback.
	await b.copyResource('other.swf', 'other.swf');
});
```

### Mac App

```js
import {BundleMacApp} from '@shockpkg/swf-projector';

const bundle = new BundleMacApp('bundle-macapp/application.app');

// Use projector property to set options.
bundle.projector.removeCodeSignature = true;

await bundle.withFile('player.dmg', 'movie.swf', async b => {
	// Add resources in callback.
	await b.copyResource('other.swf', 'other.swf');
});
```

### Linux 32-bit

```js
import {BundleLinux32} from '@shockpkg/swf-projector';

const bundle = new BundleLinux32('bundle-linux32/application');

// Use projector property to set options.
bundle.projector.patchProjectorPath = true;

await bundle.withFile('player.tar.gz', 'movie.swf', async b => {
	// Add resources in callback.
	await b.copyResource('other.swf', 'other.swf');
});
```

### Linux 64-bit

```js
import {BundleLinux64} from '@shockpkg/swf-projector';

const bundle = new BundleLinux64('bundle-linux64/application');

// Use projector property to set options.
bundle.projector.patchProjectorPath = true;
bundle.projector.patchProjectorOffset = true;

await bundle.withFile('player.tar.gz', 'movie.swf', async b => {
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

## Mac App

### Option: `patchWindowTitle`

An option to set a custom window title in the binary (no length limit since library version 3).

## Linux

### Option: `patchWindowTitle`

An option to replace the window title stored in the binary (no length limit since library version 3).

### Option: `patchMenuRemove`

An option to completely disable the menu for the projector.

### Option: `patchProjectorPath`

Compatible with Flash Player 9+ (version 6 was correct).

Required since Flash Player 10.1+ to load relative paths (earlier versions would try the relative path first, before trying resolved path).

Projectors create the main URL with: `"file:" + argv[0]` resolving to a bad URL like `file://file|%2Fpath%2Fto%2Fapplication` causing relative paths to load from the root of the drive.

This patch replaces the string reference to use `"file://" + argv[0]` instead, which resolves to `file:///path/to/application` when run by an absolute path.

Not a perfect patch because it does not resolve the full path first, if run from relative path would get path like `file://./application`, but an improvement. Recommended to use a shell script or binary that resolves itself and runs projector from an absolute path. Using a Bundle does this automatically.

### Option: `patchProjectorOffset`

The Linux projector reading code was never updated for 64-bit ELF compatibility. This patch fixes reading projector data in 64-bit Linux projectors.

# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.

# License

Copyright (c) 2019-2022 JrMasterModelBuilder

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.

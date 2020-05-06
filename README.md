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

Can also create bundles that group the projector and resources in a directory beside a single launcher for Windows and Linux or within an application bundle for macOS.

Reading DMG projector packages is only supported on macOS.


# Usage

## Projector

### Windows

```js
import {ProjectorWindows32} from '@shockpkg/swf-projector';

const projector = new ProjectorWindows('projector-windows32/application.exe');

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

// Optionally remove now-broken signature.
projector.removeCodeSignature = true;

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

// Optionally remove file associations.
projector.removeFileAssociations = true;

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

### Windows

```js
import {BundleWindows32} from '@shockpkg/swf-projector';

const bundle = new BundleWindows32('bundle-windows32/application.exe');

// Use projector property to set options.
bundle.projector.removeCodeSignature = true;

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

Not a perfect patch because it does not resolve the full path first, if run from relative path would get path like `file://./application`, but an improvement. Recommended to use a shell script or binary that resolves itself and runs projector from an absolute path. Using a Bundle does this automatically.

### Option: `patchProjectorOffset`

The Linux projector reading code was never updated for 64-bit ELF compatibility. This patch fixes reading projector data in 64-bit Linux projectors.


# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.


# License

Copyright (c) 2019-2020 JrMasterModelBuilder

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.

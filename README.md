# SWF Projector

Package for creating Flash Player projectors

[![npm](https://img.shields.io/npm/v/@shockpkg/swf-projector.svg)](https://npmjs.com/package/@shockpkg/swf-projector)
[![node](https://img.shields.io/node/v/@shockpkg/swf-projector.svg)](https://nodejs.org)

[![size](https://packagephobia.now.sh/badge?p=@shockpkg/swf-projector)](https://packagephobia.now.sh/result?p=@shockpkg/swf-projector)
[![downloads](https://img.shields.io/npm/dm/@shockpkg/swf-projector.svg)](https://npmcharts.com/compare/@shockpkg/swf-projector?minimal=true)

[![main](https://github.com/shockpkg/swf-projector/actions/workflows/main.yaml/badge.svg)](https://github.com/shockpkg/swf-projector/actions/workflows/main.yaml)

# Overview

Creates Flash projectors from a standalone Flash Player.

Takes a standalone Flash Player file, a directory containing a standalone Flash Player, or an archive containing a standalone Flash Player (shockpkg package file). Can also generate HTML files to embed content.

Can also create bundles that group the projector and resources in a directory beside a single launcher for Windows and Linux or within an application bundle for macOS.

Reading DMG projector packages is only supported on macOS, using ZIP packages instead is recommended.

# Usage

## Projector

### Projector SA

#### Projector SA Windows

```js
import {ProjectorSaWindows} from '@shockpkg/swf-projector';

const projector = new ProjectorSaWindows('projector-windows/application.exe');

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

#### Projector SA Mac

```js
import {ProjectorSaMac} from '@shockpkg/swf-projector';

const projector = new ProjectorSaMac('projector-mac/application.app');

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

#### Projector SA Linux

```js
import {ProjectorSaLinux} from '@shockpkg/swf-projector';

const projector = new ProjectorSaLinux('projector-linux/application');

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

### Projector HTML

```js
import {ProjectorHtml} from '@shockpkg/swf-projector';

const projector = new ProjectorHtml('projector-html/application.html');

// Required properties.
projector.src = 'movie.swf';
projector.width = 600;
projector.height = 400;

// Optionally configure HTML document.
p.lang = 'en-US';
p.title = 'A "special" title with <html> characters';
p.background = '#000000';
p.color = '#999999';

// Optionally configure object/param/embed elements.
p.bgcolor = '#000000';
p.id = 'element-id';
p.name = 'element-name';
p.codebase =
	'https://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=32,0,0,0';
p.pluginspage = 'https://www.adobe.com/go/getflashplayer';
p.play = true;
p.loop = true;
p.menu = true;
p.quality = 'high';
p.scale = 'default';
p.align = 'l';
p.salign = 'l';
p.wmode = 'opaque';
p.base = '.';
p.allowFullScreen = true;
p.allowFullScreenInteractive = true;
p.allowScriptAccess = 'always';
p.allowNetworking = 'all';
p.fullScreenAspectRatio = 'landscape';
p.flashvars = 'param1=value1&param2=value2';
p.browserzoom = 'scale';
p.devicefont = false;
p.swliveconnect = true;
p.expressinstall = 'expressinstall.swf';
p.swfversion = 32;

await projector.write();
```

## Bundle

### Bundle SA

#### Bundle SA Windows

```js
import {BundleSaWindows} from '@shockpkg/swf-projector';

const bundle = new BundleSaWindows('bundle-windows/application.exe');

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

#### Bundle SA Mac

```js
import {BundleSaMac} from '@shockpkg/swf-projector';

const bundle = new BundleSaMac('bundle-mac/application.app');

// Use projector property to set options.
bundle.projector.player = 'player.zip';
bundle.projector.movie = 'movie.swf';
bundle.projector.removeCodeSignature = true;

await bundle.write(async b => {
	// Add resources in callback.
	await b.copyResource('other.swf', 'other.swf');
});
```

#### Bundle SA Linux

```js
import {BundleSaLinux} from '@shockpkg/swf-projector';

const bundle = new BundleSaLinux('bundle-linux/application');

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

### Bundle HTML

```js
import {BundleHtml} from '@shockpkg/swf-projector';

const bundle = new BundleHtml('bundle-html/application.html');

// Use projector property to set options.
bundle.projector.src = 'movie.swf';
bundle.projector.width = 600;
bundle.projector.height = 400;

await bundle.write(async b => {
	// Add resources in callback.
	await b.copyResource('movie.swf', 'movie.swf');
});
```

A bundle can also be made "flat" into an empty directory without nesting the resources or adding a launcher stub by passing true as the second argument to the constructor.

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

### Option: `removeCodeSignature`

A Windows projector cannot be properly codesigned, so removing the signature makes it smaller.

## Mac

### Option: `patchWindowTitle`

An option to set a custom window title in the binary (no length limit since library version 3).

### Option: `removeCodeSignature`

The code signature will be broken, lightly by adding the movie resource, or heavily by patching the binary. For projectors without an arm64 binary, this can avoid some issues where the code signature is broken.

An application with an arm64 binary however does require a valid code signature to run, even if it's just an ad-hoc one. Currently this library doesn't have a way to ad-hoc codesign, so it must be done after the projector or bundle is produced.

```bash
# For non-flat bundles, first sign the nested projector:
codesign -f -s - application.app/Contents/Resources/*.app

# Then sign the main projector or bundle application:
codesign -f -s - application.app
```

Alternately the application bundle could be signed with a real code signing certificate.

## Linux

### Option: `patchWindowTitle`

An option to replace the window title stored in the binary (no length limit since library version 3).

### Option: `patchMenuRemove`

An option to completely disable the menu for the projector.

### Option: `patchProjectorPath`

Required in Flash Player 6 and Flash Player 10.1+ to load relative paths (other versions would try the relative path first, before trying resolved path).

Projectors version 9+ create the main URL with `"file:" + argv[0]` resolving to a bad URL like `file://file|%2Fpath%2Fto%2Fapplication` causing relative paths to load from the root directory. For such projectors this patch replaces the string reference to use `"file://" + argv[0]` instead, which resolves to `file:///path/to/application` when run by an absolute path.

Projector version 6 would use the current working directory for the main URL, causing relative paths to start in the directory above the projector binary. For such projectors this patch replaces the directory string reference to use `argv[0]` instead.

Not a perfect patch because it does not resolve the full path first, but a useful improvement. If run from a relative path it would get a path like `file://./application` so it is recommended to use a shell script or binary to resolve and run the projector from an absolute path. Using a non-flat Bundle does this automatically.

### Option: `patchProjectorOffset`

The Linux projector reading code was never updated for 64-bit ELF compatibility. This patch fixes reading projector data in 64-bit Linux projectors.

# Bugs

If you find a bug or have compatibility issues, please open a ticket under issues section for this repository.

# License

Copyright (c) 2019-2024 JrMasterModelBuilder

Licensed under the Mozilla Public License, v. 2.0.

If this license does not work for you, feel free to contact me.

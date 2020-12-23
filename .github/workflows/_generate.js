'use strict';

const fs = require('fs').promises;

const configs = [
	[
		'main',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[]
	],
	[
		'node-10.0.0',
		'ubuntu-20.04',
		'10.0.0',
		{
			lint: false
		},
		[
			'flash-player-11.2.202.644-linux-i386-sa',
			'flash-player-32.0.0.465-linux-x86_64-sa',
			'flash-player-32.0.0.465-windows-sa',
			'flash-player-32.0.0.465-mac-sa-zip'
		]
	],
	[
		'node-15.5.0',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-11.2.202.644-linux-i386-sa',
			'flash-player-32.0.0.465-linux-x86_64-sa',
			'flash-player-32.0.0.465-windows-sa',
			'flash-player-32.0.0.465-mac-sa-zip'
		]
	],
	// Test other Windows versions:
	[
		'windows-other',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			// Only 3.0 32-bit:
			'flash-player-3.0.8.0-windows-32bit-sa',
			// Only 4.0:
			'flash-player-4.0.7.0-windows-sa',
			// Only 5.0 (release, and first debug):
			'flash-player-5.0.30.0-windows-sa',
			'flash-player-5.0.30.0-windows-sa-debug',
			// First 6.0:
			'flash-player-6.0.21.0-windows-sa',
			// Last 6.0:
			'flash-player-6.0.79.0-windows-sa',
			// First 7.0:
			'flash-player-7.0.14.0-windows-sa',
			// Last 7.0:
			'flash-player-7.0.19.0-windows-sa',
			// First 8.0:
			'flash-player-8.0.22.0-windows-sa',
			// Last 8.0:
			'flash-player-8.0.42.0-windows-sa',
			// First 9.0, first code-signed:
			'flash-player-9.0.15.0-windows-sa-debug',
			// First 9.0 release:
			'flash-player-9.0.115.0-windows-sa',
			// Last 9.0 before 10.0:
			'flash-player-9.0.280.0-windows-sa',
			// Last 9.0:
			'flash-player-9.0.289.0-windows-sa',
			// First 10.0:
			'flash-player-10.0.12.36-windows-sa',
			// Last 10.0:
			'flash-player-10.0.45.2-windows-sa',
			// Last 10.3, not code-signed:
			'flash-player-10.3.183.90-windows-sa',
			// First 11.1:
			'flash-player-11.1.102.55-windows-32bit-sa',
			// Latest:
			'flash-player-32.0.0.465-windows-sa',
			'flash-player-32.0.0.465-windows-sa-debug'
		]
	],
	// Test other Mac versions:
	[
		'mac-other',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			// First Mac APP bundle, broken icon, DMG:
			'flash-player-9.0.28.0-mac-sa-debug-zip',
			// Early Mac APP bundle, broken icon, ZIP:
			'flash-player-9.0.45.0-mac-sa-debug',
			// First Mac APP, correct icon, ZIP:
			'flash-player-9.0.115.0-mac-sa',
			'flash-player-9.0.115.0-mac-sa-debug',
			// Last 9.0 before 10.0:
			'flash-player-9.0.280.0-mac-sa',
			// Last 9.0:
			'flash-player-9.0.289.0-mac-sa',
			// Last 10.0:
			'flash-player-10.0.12.36-mac-sa',
			// Last before code-signing:
			'flash-player-10.0.45.2-mac-sa-debug',
			// First code-signed:
			'flash-player-10.1.53.64-mac-sa',
			// Last ppc+i386, revoked cert:
			'flash-player-10.1.102.64-mac-sa',
			// First i386, first 10.2, revoked cert:
			'flash-player-10.2.152.26-mac-sa',
			// Last 10.2, revoked cert, no PPC:
			'flash-player-10.2.159.1-mac-sa',
			// First 10.3, not code-signed:
			'flash-player-10.3.181.14-mac-sa',
			// Last i386, last 10.3, code-signed:
			'flash-player-10.3.183.90-mac-sa',
			// First i386+x86_64, only 11.0, revoked cert:
			'flash-player-11.0.1.152-mac-sa',
			// First 11.1:
			'flash-player-11.1.102.55-mac-sa',
			// Last signature V1:
			'flash-player-15.0.0.152-mac-sa-debug-zip',
			// First signature V2:
			'flash-player-15.0.0.189-mac-sa-debug-zip',
			// Last i386+x86_64:
			'flash-player-32.0.0.238-mac-sa-zip',
			// First only x86_64:
			'flash-player-32.0.0.255-mac-sa-zip',
			// Latest:
			'flash-player-32.0.0.465-mac-sa-zip',
			'flash-player-32.0.0.465-mac-sa-debug-zip'
		]
	],
	// Test other Linux i386 versions:
	[
		'linux-other',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			// Only 6.0, first version (ZLIB):
			'flash-player-6.0.79.0-linux-sa',
			// First 9.0:
			'flash-player-9.0.115.0-linux-sa',
			// First debug:
			'flash-player-9.0.115.0-linux-sa-debug',
			// Last 9.0 before 10.0:
			'flash-player-9.0.280.0-linux-sa',
			// Last 9.0:
			'flash-player-9.0.289.0-linux-sa',
			// First 10.0:
			'flash-player-10.0.12.36-linux-sa',
			// Last 10.3:
			'flash-player-10.3.183.90-linux-sa',
			// First 11.0:
			'flash-player-11.0.1.152-linux-i386-sa',
			'flash-player-11.0.1.152-linux-i386-sa-debug',
			// First 11.1 (LZMA):
			'flash-player-11.1.102.55-linux-i386-sa',
			// Last 11.2, last i386, before long release break:
			'flash-player-11.2.202.644-linux-i386-sa',
			'flash-player-11.2.202.644-linux-i386-sa-debug'
		]
	],
	// Test every Linux x86_64 version (ensures ASM patchs works on all versions):
	[
		'linux-32.0.0.100',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
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
			'flash-player-32.0.0.192-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-32.0.0.200',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-32.0.0.207-linux-x86_64-sa',
			'flash-player-32.0.0.207-linux-x86_64-sa-debug',
			'flash-player-32.0.0.223-linux-x86_64-sa',
			'flash-player-32.0.0.223-linux-x86_64-sa-debug',
			'flash-player-32.0.0.238-linux-x86_64-sa',
			'flash-player-32.0.0.238-linux-x86_64-sa-debug',
			'flash-player-32.0.0.255-linux-x86_64-sa',
			'flash-player-32.0.0.255-linux-x86_64-sa-debug',
			'flash-player-32.0.0.270-linux-x86_64-sa',
			'flash-player-32.0.0.270-linux-x86_64-sa-debug',
			'flash-player-32.0.0.293-linux-x86_64-sa',
			'flash-player-32.0.0.293-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-32.0.0.300',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-32.0.0.303-linux-x86_64-sa',
			'flash-player-32.0.0.303-linux-x86_64-sa-debug',
			'flash-player-32.0.0.314-linux-x86_64-sa',
			'flash-player-32.0.0.314-linux-x86_64-sa-debug',
			'flash-player-32.0.0.321-linux-x86_64-sa',
			'flash-player-32.0.0.321-linux-x86_64-sa-debug',
			'flash-player-32.0.0.330-linux-x86_64-sa',
			'flash-player-32.0.0.330-linux-x86_64-sa-debug',
			'flash-player-32.0.0.344-linux-x86_64-sa',
			'flash-player-32.0.0.344-linux-x86_64-sa-debug',
			'flash-player-32.0.0.363-linux-x86_64-sa',
			'flash-player-32.0.0.363-linux-x86_64-sa-debug',
			'flash-player-32.0.0.371-linux-x86_64-sa',
			'flash-player-32.0.0.371-linux-x86_64-sa-debug',
			'flash-player-32.0.0.387-linux-x86_64-sa',
			'flash-player-32.0.0.387-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-32.0.0.400',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-32.0.0.403-linux-x86_64-sa',
			'flash-player-32.0.0.403-linux-x86_64-sa-debug',
			'flash-player-32.0.0.414-linux-x86_64-sa',
			'flash-player-32.0.0.414-linux-x86_64-sa-debug',
			'flash-player-32.0.0.433-linux-x86_64-sa',
			'flash-player-32.0.0.433-linux-x86_64-sa-debug',
			'flash-player-32.0.0.445-linux-x86_64-sa',
			'flash-player-32.0.0.445-linux-x86_64-sa-debug',
			'flash-player-32.0.0.453-linux-x86_64-sa',
			'flash-player-32.0.0.453-linux-x86_64-sa-debug',
			'flash-player-32.0.0.465-linux-x86_64-sa',
			'flash-player-32.0.0.465-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-31',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-31.0.0.108-linux-x86_64-sa',
			'flash-player-31.0.0.108-linux-x86_64-sa-debug',
			'flash-player-31.0.0.122-linux-x86_64-sa',
			'flash-player-31.0.0.122-linux-x86_64-sa-debug',
			'flash-player-31.0.0.148-linux-x86_64-sa',
			'flash-player-31.0.0.148-linux-x86_64-sa-debug',
			'flash-player-31.0.0.153-linux-x86_64-sa',
			'flash-player-31.0.0.153-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-30',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-30.0.0.113-linux-x86_64-sa',
			'flash-player-30.0.0.113-linux-x86_64-sa-debug',
			'flash-player-30.0.0.134-linux-x86_64-sa',
			'flash-player-30.0.0.134-linux-x86_64-sa-debug',
			'flash-player-30.0.0.154-linux-x86_64-sa',
			'flash-player-30.0.0.154-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-29',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-29.0.0.113-linux-x86_64-sa',
			'flash-player-29.0.0.113-linux-x86_64-sa-debug',
			'flash-player-29.0.0.140-linux-x86_64-sa',
			'flash-player-29.0.0.140-linux-x86_64-sa-debug',
			'flash-player-29.0.0.171-linux-x86_64-sa',
			'flash-player-29.0.0.171-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-28',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-28.0.0.126-linux-x86_64-sa',
			'flash-player-28.0.0.126-linux-x86_64-sa-debug',
			'flash-player-28.0.0.137-linux-x86_64-sa',
			'flash-player-28.0.0.137-linux-x86_64-sa-debug',
			'flash-player-28.0.0.161-linux-x86_64-sa',
			'flash-player-28.0.0.161-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-27',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-27.0.0.130-linux-x86_64-sa',
			'flash-player-27.0.0.130-linux-x86_64-sa-debug',
			'flash-player-27.0.0.159-linux-x86_64-sa',
			'flash-player-27.0.0.159-linux-x86_64-sa-debug',
			'flash-player-27.0.0.170-linux-x86_64-sa',
			'flash-player-27.0.0.170-linux-x86_64-sa-debug',
			'flash-player-27.0.0.183-linux-x86_64-sa',
			'flash-player-27.0.0.183-linux-x86_64-sa-debug',
			'flash-player-27.0.0.187-linux-x86_64-sa',
			'flash-player-27.0.0.187-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-26',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-26.0.0.126-linux-x86_64-sa',
			'flash-player-26.0.0.126-linux-x86_64-sa-debug',
			'flash-player-26.0.0.131-linux-x86_64-sa',
			'flash-player-26.0.0.131-linux-x86_64-sa-debug',
			'flash-player-26.0.0.137-linux-x86_64-sa',
			'flash-player-26.0.0.137-linux-x86_64-sa-debug',
			'flash-player-26.0.0.151-linux-x86_64-sa',
			'flash-player-26.0.0.151-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-25',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-25.0.0.127-linux-x86_64-sa',
			'flash-player-25.0.0.127-linux-x86_64-sa-debug',
			'flash-player-25.0.0.148-linux-x86_64-sa',
			'flash-player-25.0.0.148-linux-x86_64-sa-debug',
			'flash-player-25.0.0.171-linux-x86_64-sa',
			'flash-player-25.0.0.171-linux-x86_64-sa-debug'
		]
	],
	[
		'linux-24',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-24.0.0.186-linux-x86_64-sa',
			'flash-player-24.0.0.186-linux-x86_64-sa-debug',
			'flash-player-24.0.0.194-linux-x86_64-sa',
			'flash-player-24.0.0.194-linux-x86_64-sa-debug',
			'flash-player-24.0.0.221-linux-x86_64-sa',
			'flash-player-24.0.0.221-linux-x86_64-sa-debug'
		]
	],
	// Test every Linux i386 version (ensures ASM patchs works on all versions):
	[
		'linux-11.2.202.600',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-11.2.202.616-linux-i386-sa',
			'flash-player-11.2.202.616-linux-i386-sa-debug',
			'flash-player-11.2.202.621-linux-i386-sa',
			'flash-player-11.2.202.621-linux-i386-sa-debug',
			'flash-player-11.2.202.626-linux-i386-sa',
			'flash-player-11.2.202.626-linux-i386-sa-debug',
			'flash-player-11.2.202.632-linux-i386-sa',
			'flash-player-11.2.202.632-linux-i386-sa-debug',
			'flash-player-11.2.202.635-linux-i386-sa',
			'flash-player-11.2.202.635-linux-i386-sa-debug',
			'flash-player-11.2.202.637-linux-i386-sa',
			'flash-player-11.2.202.637-linux-i386-sa-debug',
			'flash-player-11.2.202.643-linux-i386-sa',
			'flash-player-11.2.202.643-linux-i386-sa-debug',
			'flash-player-11.2.202.644-linux-i386-sa',
			'flash-player-11.2.202.644-linux-i386-sa-debug'
		]
	],
	[
		'linux-11.2.202.500',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-11.2.202.508-linux-i386-sa',
			'flash-player-11.2.202.508-linux-i386-sa-debug',
			'flash-player-11.2.202.521-linux-i386-sa',
			'flash-player-11.2.202.521-linux-i386-sa-debug',
			'flash-player-11.2.202.535-linux-i386-sa',
			'flash-player-11.2.202.535-linux-i386-sa-debug',
			'flash-player-11.2.202.540-linux-i386-sa',
			'flash-player-11.2.202.540-linux-i386-sa-debug',
			'flash-player-11.2.202.548-linux-i386-sa',
			'flash-player-11.2.202.548-linux-i386-sa-debug',
			'flash-player-11.2.202.554-linux-i386-sa',
			'flash-player-11.2.202.554-linux-i386-sa-debug',
			'flash-player-11.2.202.559-linux-i386-sa',
			'flash-player-11.2.202.559-linux-i386-sa-debug',
			'flash-player-11.2.202.569-linux-i386-sa',
			'flash-player-11.2.202.569-linux-i386-sa-debug',
			'flash-player-11.2.202.577-linux-i386-sa',
			'flash-player-11.2.202.577-linux-i386-sa-debug'
		]
	],
	[
		'linux-11.2.202.400',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-11.2.202.400-linux-i386-sa',
			'flash-player-11.2.202.400-linux-i386-sa-debug',
			'flash-player-11.2.202.406-linux-i386-sa',
			'flash-player-11.2.202.406-linux-i386-sa-debug',
			'flash-player-11.2.202.411-linux-i386-sa',
			'flash-player-11.2.202.411-linux-i386-sa-debug',
			'flash-player-11.2.202.418-linux-i386-sa',
			'flash-player-11.2.202.418-linux-i386-sa-debug',
			'flash-player-11.2.202.424-linux-i386-sa',
			'flash-player-11.2.202.424-linux-i386-sa-debug',
			'flash-player-11.2.202.425-linux-i386-sa',
			'flash-player-11.2.202.425-linux-i386-sa-debug',
			'flash-player-11.2.202.429-linux-i386-sa',
			'flash-player-11.2.202.429-linux-i386-sa-debug',
			'flash-player-11.2.202.438-linux-i386-sa',
			'flash-player-11.2.202.438-linux-i386-sa-debug',
			'flash-player-11.2.202.440-linux-i386-sa',
			'flash-player-11.2.202.440-linux-i386-sa-debug',
			'flash-player-11.2.202.442-linux-i386-sa',
			'flash-player-11.2.202.442-linux-i386-sa-debug',
			'flash-player-11.2.202.451-linux-i386-sa',
			'flash-player-11.2.202.451-linux-i386-sa-debug',
			'flash-player-11.2.202.457-linux-i386-sa',
			'flash-player-11.2.202.457-linux-i386-sa-debug',
			'flash-player-11.2.202.460-linux-i386-sa',
			'flash-player-11.2.202.460-linux-i386-sa-debug',
			'flash-player-11.2.202.466-linux-i386-sa',
			'flash-player-11.2.202.466-linux-i386-sa-debug',
			'flash-player-11.2.202.468-linux-i386-sa',
			'flash-player-11.2.202.468-linux-i386-sa-debug',
			'flash-player-11.2.202.481-linux-i386-sa',
			'flash-player-11.2.202.481-linux-i386-sa-debug',
			'flash-player-11.2.202.491-linux-i386-sa',
			'flash-player-11.2.202.491-linux-i386-sa-debug'
		]
	],
	[
		'linux-11.2.202.300',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-11.2.202.310-linux-i386-sa',
			'flash-player-11.2.202.310-linux-i386-sa-debug',
			'flash-player-11.2.202.327-linux-i386-sa',
			'flash-player-11.2.202.327-linux-i386-sa-debug',
			'flash-player-11.2.202.332-linux-i386-sa',
			'flash-player-11.2.202.332-linux-i386-sa-debug',
			'flash-player-11.2.202.335-linux-i386-sa',
			'flash-player-11.2.202.335-linux-i386-sa-debug',
			'flash-player-11.2.202.336-linux-i386-sa',
			'flash-player-11.2.202.341-linux-i386-sa',
			'flash-player-11.2.202.341-linux-i386-sa-debug',
			'flash-player-11.2.202.346-linux-i386-sa',
			'flash-player-11.2.202.346-linux-i386-sa-debug',
			'flash-player-11.2.202.350-linux-i386-sa',
			'flash-player-11.2.202.350-linux-i386-sa-debug',
			'flash-player-11.2.202.356-linux-i386-sa',
			'flash-player-11.2.202.356-linux-i386-sa-debug',
			'flash-player-11.2.202.359-linux-i386-sa',
			'flash-player-11.2.202.359-linux-i386-sa-debug',
			'flash-player-11.2.202.378-linux-i386-sa',
			'flash-player-11.2.202.378-linux-i386-sa-debug',
			'flash-player-11.2.202.394-linux-i386-sa',
			'flash-player-11.2.202.394-linux-i386-sa-debug'
		]
	],
	[
		'linux-11.2.202.200',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-11.2.202.228-linux-i386-sa',
			'flash-player-11.2.202.228-linux-i386-sa-debug',
			'flash-player-11.2.202.233-linux-i386-sa',
			'flash-player-11.2.202.233-linux-i386-sa-debug',
			'flash-player-11.2.202.235-linux-i386-sa',
			'flash-player-11.2.202.235-linux-i386-sa-debug',
			'flash-player-11.2.202.238-linux-i386-sa',
			'flash-player-11.2.202.238-linux-i386-sa-debug',
			'flash-player-11.2.202.243-linux-i386-sa',
			'flash-player-11.2.202.243-linux-i386-sa-debug',
			'flash-player-11.2.202.251-linux-i386-sa',
			'flash-player-11.2.202.251-linux-i386-sa-debug',
			'flash-player-11.2.202.258-linux-i386-sa',
			'flash-player-11.2.202.258-linux-i386-sa-debug',
			'flash-player-11.2.202.261-linux-i386-sa',
			'flash-player-11.2.202.261-linux-i386-sa-debug',
			'flash-player-11.2.202.262-linux-i386-sa',
			'flash-player-11.2.202.262-linux-i386-sa-debug',
			'flash-player-11.2.202.270-linux-i386-sa',
			'flash-player-11.2.202.270-linux-i386-sa-debug',
			'flash-player-11.2.202.273-linux-i386-sa',
			'flash-player-11.2.202.273-linux-i386-sa-debug',
			'flash-player-11.2.202.275-linux-i386-sa',
			'flash-player-11.2.202.275-linux-i386-sa-debug',
			'flash-player-11.2.202.280-linux-i386-sa',
			'flash-player-11.2.202.280-linux-i386-sa-debug',
			'flash-player-11.2.202.285-linux-i386-sa',
			'flash-player-11.2.202.285-linux-i386-sa-debug',
			'flash-player-11.2.202.291-linux-i386-sa',
			'flash-player-11.2.202.291-linux-i386-sa-debug',
			'flash-player-11.2.202.297-linux-i386-sa',
			'flash-player-11.2.202.297-linux-i386-sa-debug'
		]
	],
	[
		'linux-11.0-11.1',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-11.0.1.152-linux-i386-sa',
			'flash-player-11.0.1.152-linux-i386-sa-debug',
			'flash-player-11.1.102.55-linux-i386-sa',
			'flash-player-11.1.102.55-linux-i386-sa-debug',
			'flash-player-11.1.102.62-linux-i386-sa',
			'flash-player-11.1.102.62-linux-i386-sa-debug',
			'flash-player-11.1.102.63-linux-i386-sa',
			'flash-player-11.1.102.63-linux-i386-sa-debug'
		]
	],
	[
		'linux-10.3',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-10.3.181.14-linux-sa',
			'flash-player-10.3.181.14-linux-sa-debug',
			'flash-player-10.3.181.22-linux-sa',
			'flash-player-10.3.181.22-linux-sa-debug',
			'flash-player-10.3.181.26-linux-sa',
			'flash-player-10.3.181.26-linux-sa-debug',
			'flash-player-10.3.181.34-linux-sa',
			'flash-player-10.3.181.34-linux-sa-debug',
			'flash-player-10.3.183.5-linux-sa',
			'flash-player-10.3.183.5-linux-sa-debug',
			'flash-player-10.3.183.7-linux-sa',
			'flash-player-10.3.183.7-linux-sa-debug',
			'flash-player-10.3.183.10-linux-sa',
			'flash-player-10.3.183.10-linux-sa-debug',
			'flash-player-10.3.183.11-linux-sa',
			'flash-player-10.3.183.11-linux-sa-debug',
			'flash-player-10.3.183.15-linux-sa',
			'flash-player-10.3.183.15-linux-sa-debug',
			'flash-player-10.3.183.16-linux-sa',
			'flash-player-10.3.183.16-linux-sa-debug',
			'flash-player-10.3.183.18-linux-sa',
			'flash-player-10.3.183.18-linux-sa-debug',
			'flash-player-10.3.183.20-linux-sa',
			'flash-player-10.3.183.20-linux-sa-debug',
			'flash-player-10.3.183.23-linux-sa',
			'flash-player-10.3.183.23-linux-sa-debug',
			'flash-player-10.3.183.29-linux-sa',
			'flash-player-10.3.183.29-linux-sa-debug',
			'flash-player-10.3.183.43-linux-sa',
			'flash-player-10.3.183.43-linux-sa-debug',
			'flash-player-10.3.183.48-linux-sa-debug',
			'flash-player-10.3.183.50-linux-sa',
			'flash-player-10.3.183.50-linux-sa-debug',
			'flash-player-10.3.183.51-linux-sa',
			'flash-player-10.3.183.51-linux-sa-debug',
			'flash-player-10.3.183.61-linux-sa',
			'flash-player-10.3.183.61-linux-sa-debug',
			'flash-player-10.3.183.67-linux-sa',
			'flash-player-10.3.183.67-linux-sa-debug',
			'flash-player-10.3.183.68-linux-sa',
			'flash-player-10.3.183.68-linux-sa-debug',
			'flash-player-10.3.183.75-linux-sa',
			'flash-player-10.3.183.75-linux-sa-debug',
			'flash-player-10.3.183.86-linux-sa',
			'flash-player-10.3.183.86-linux-sa-debug',
			'flash-player-10.3.183.90-linux-sa',
			'flash-player-10.3.183.90-linux-sa-debug'
		]
	],
	[
		'linux-10.2',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-10.2.152.26-linux-sa',
			'flash-player-10.2.152.26-linux-sa-debug',
			'flash-player-10.2.153.1-linux-sa',
			'flash-player-10.2.153.1-linux-sa-debug',
			'flash-player-10.2.159.1-linux-sa',
			'flash-player-10.2.159.1-linux-sa-debug'
		]
	],
	[
		'linux-10.1',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-10.1.53.64-linux-sa',
			'flash-player-10.1.53.64-linux-sa-debug',
			'flash-player-10.1.82.76-linux-sa',
			'flash-player-10.1.82.76-linux-sa-debug',
			'flash-player-10.1.85.3-linux-sa',
			'flash-player-10.1.102.64-linux-sa',
			'flash-player-10.1.102.64-linux-sa-debug'
		]
	],
	[
		'linux-10.0',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-10.0.12.36-linux-sa',
			'flash-player-10.0.12.36-linux-sa-debug',
			'flash-player-10.0.15.3-linux-sa',
			'flash-player-10.0.15.3-linux-sa-debug',
			'flash-player-10.0.22.87-linux-sa',
			'flash-player-10.0.22.87-linux-sa-debug',
			'flash-player-10.0.32.18-linux-sa',
			'flash-player-10.0.32.18-linux-sa-debug',
			'flash-player-10.0.42.34-linux-sa',
			'flash-player-10.0.42.34-linux-sa-debug',
			'flash-player-10.0.45.2-linux-sa-debug'
		]
	],
	[
		'linux-6-9',
		'ubuntu-20.04',
		'15.5.0',
		{
			lint: true
		},
		[
			'flash-player-6.0.79.0-linux-sa',
			'flash-player-9.0.115.0-linux-sa',
			'flash-player-9.0.115.0-linux-sa-debug',
			'flash-player-9.0.124.0-linux-sa',
			'flash-player-9.0.124.0-linux-sa-debug',
			'flash-player-9.0.151.0-linux-sa',
			'flash-player-9.0.151.0-linux-sa-debug',
			'flash-player-9.0.152.0-linux-sa',
			'flash-player-9.0.152.0-linux-sa-debug',
			'flash-player-9.0.159.0-linux-sa',
			'flash-player-9.0.159.0-linux-sa-debug',
			'flash-player-9.0.246.0-linux-sa',
			'flash-player-9.0.246.0-linux-sa-debug',
			'flash-player-9.0.260.0-linux-sa',
			'flash-player-9.0.260.0-linux-sa-debug',
			'flash-player-9.0.262.0-linux-sa',
			'flash-player-9.0.262.0-linux-sa-debug',
			'flash-player-9.0.277.0-linux-sa',
			'flash-player-9.0.277.0-linux-sa-debug',
			'flash-player-9.0.280.0-linux-sa',
			'flash-player-9.0.283.0-linux-sa',
			'flash-player-9.0.283.0-linux-sa-debug',
			'flash-player-9.0.289.0-linux-sa',
			'flash-player-9.0.289.0-linux-sa-debug'
		]
	]
];

function template(name, runsOn, nodeVersion, lint, packages) {
	const install = packages.length ?
		`    - run: npm run shockpkg -- install ${packages.join(' ')}` :
		'';
	const linting = lint ? `    - run: npm run lint` : '';
	return `
name: '${name}'

on: push

jobs:
  build:
    runs-on: '${runsOn}'

    steps:
    - uses: actions/checkout@v2

    - uses: actions/setup-node@v1
      with:
        node-version: '${nodeVersion}'

    - run: npm install
    - run: npm run clean
    - run: npm run shockpkg -- update --summary
${install}
${linting}
    - run: npm run build
    - run: npm run test
`.trim() + '\n';
	}

async function main() {
	for (const [name, runsOn, nodeVersion, options, packages] of configs) {
		await fs.writeFile(`${name}.yml`, template(
			name,
			runsOn,
			nodeVersion,
			options.lint,
			packages
		));
	}
}
main().catch(err => {
	process.exitCode = 1;
	console.error(err);
});

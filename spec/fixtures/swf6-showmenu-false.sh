#!/bin/bash
set -o errexit
set -o nounset
set -o pipefail

makeswf \
	-c -1 \
	-v 6 \
	-s 600x400 \
	-r 30 \
	-b ffffff \
	-o swf6-showmenu-false.swf \
	swf6-showmenu-false.as
rm swf6-showmenu-false.swf.*.pp

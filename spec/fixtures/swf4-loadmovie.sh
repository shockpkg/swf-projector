#!/bin/bash
set -o errexit
set -o nounset
set -o pipefail

makeswf \
	-c -1 \
	-v 4 \
	-s 600x400 \
	-r 30 \
	-b ffffff \
	-o swf4-loadmovie.swf \
	swf4-loadmovie.as
rm swf4-loadmovie.swf.*.pp

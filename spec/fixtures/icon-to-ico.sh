#!/bin/bash

rm -rf icon.icoset
mkdir icon.icoset

convert -strip -resize 256x256             icon.png icon.icoset/icon_256x256.ico
convert -strip -resize 128x128             icon.png icon.icoset/icon_128x128.ico
convert -strip -resize 64x64               icon.png icon.icoset/icon_64x64.ico
convert -strip -resize 48x48               icon.png icon.icoset/icon_48x48.ico
convert -strip -resize 48x48   -colors 256 icon.png icon.icoset/icon_48x48i.ico
convert -strip -resize 48x48   -depth 4    icon.png icon.icoset/icon_48x48d4.ico
convert -strip -resize 32x32               icon.png icon.icoset/icon_32x32.ico
convert -strip -resize 32x32   -colors 256 icon.png icon.icoset/icon_32x32i.ico
convert -strip -resize 32x32   -depth 4    icon.png icon.icoset/icon_32x32d4.ico
convert -strip -resize 32x32   -depth 1    icon.png icon.icoset/icon_32x32d1.ico
convert -strip -resize 24x24               icon.png icon.icoset/icon_24x24.ico
convert -strip -resize 24x24   -colors 256 icon.png icon.icoset/icon_24x24i.ico
convert -strip -resize 24x24   -depth 4    icon.png icon.icoset/icon_24x24d4.ico
convert -strip -resize 24x24   -depth 1    icon.png icon.icoset/icon_24x24d1.ico
convert -strip -resize 16x16               icon.png icon.icoset/icon_16x16.ico
convert -strip -resize 16x16   -colors 256 icon.png icon.icoset/icon_16x16i.ico
convert -strip -resize 16x16   -depth 4    icon.png icon.icoset/icon_16x16d4.ico
convert -strip -resize 16x16   -depth 1    icon.png icon.icoset/icon_16x16d1.ico

convert icon.icoset/*.ico icon.ico
rm -rf icon.icoset

#!/bin/bash

rm -rf icon.icoset
mkdir icon.icoset

convert icon.png -strip -resize 256x256                                                  icon.icoset/icon_256x256.png
convert icon.png -strip -resize 128x128                                                  icon.icoset/icon_128x128.bmp
convert icon.png -strip -resize 64x64                                                    icon.icoset/icon_64x64.bmp
convert icon.png -strip -resize 48x48                                                    icon.icoset/icon_48x38.bmp
convert icon.png -strip -resize 48x48   -flatten -colors 256 -type palette          bmp3:icon.icoset/icon_48x38i.bmp
convert icon.png -strip -resize 48x48   -flatten -colors 16  -type palette -depth 4 bmp3:icon.icoset/icon_48x38d4.bmp
convert icon.png -strip -resize 32x32                                                    icon.icoset/icon_32x32.bmp
convert icon.png -strip -resize 32x32   -flatten -colors 256 -type palette          bmp3:icon.icoset/icon_32x32i.bmp
convert icon.png -strip -resize 32x32   -flatten -colors 16  -type palette -depth 4 bmp3:icon.icoset/icon_32x32d4.bmp
convert icon.png -strip -resize 24x24                                                    icon.icoset/icon_24x24.bmp
convert icon.png -strip -resize 24x24   -flatten -colors 256 -type palette          bmp3:icon.icoset/icon_24x24i.bmp
convert icon.png -strip -resize 24x24   -flatten -colors 16  -type palette -depth 4 bmp3:icon.icoset/icon_24x24d4.bmp
convert icon.png -strip -resize 16x16                                                    icon.icoset/icon_16x16.bmp
convert icon.png -strip -resize 16x16   -flatten -colors 256 -type palette          bmp3:icon.icoset/icon_16x16i.bmp
convert icon.png -strip -resize 16x16   -flatten -colors 16  -type palette -depth 4 bmp3:icon.icoset/icon_16x16d4.bmp

convert icon.icoset/*.png icon.icoset/*.bmp icon.ico
rm -rf icon.icoset

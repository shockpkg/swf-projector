#!/bin/bash

rm -rf icon.iconset
mkdir icon.iconset

convert -strip -resize 1024x1024 icon.png icon.iconset/icon_512x512@2x.png
convert -strip -resize 512x512   icon.png icon.iconset/icon_512x512.png
convert -strip -resize 512x512   icon.png icon.iconset/icon_256x256@2x.png
convert -strip -resize 256x256   icon.png icon.iconset/icon_256x256.png
convert -strip -resize 256x256   icon.png icon.iconset/icon_128x128@2x.png
convert -strip -resize 128x128   icon.png icon.iconset/icon_128x128.png
convert -strip -resize 64x64     icon.png icon.iconset/icon_32x32@2x.png
convert -strip -resize 32x32     icon.png icon.iconset/icon_32x32.png
convert -strip -resize 32x32     icon.png icon.iconset/icon_16x16@2x.png
convert -strip -resize 16x16     icon.png icon.iconset/icon_16x16.png

iconutil -c icns icon.iconset
rm -rf icon.iconset

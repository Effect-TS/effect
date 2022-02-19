#!/bin/sh
cp .swcrc build && cd build && ../../../node_modules/.bin/swc ./esm -d ./cjs

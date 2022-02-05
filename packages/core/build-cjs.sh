#!/bin/sh
yarn ets:esbuild `find build/esm \\( -name '*.js' \\)` --platform=node --target=node10.4 --format=cjs --outdir=build/cjs --log-level=error

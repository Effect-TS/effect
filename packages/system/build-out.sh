#!/bin/sh
yarn ets:concurrently \
    "yarn ets:babel build/out/ --out-dir build/mjs/ --out-file-extension .mjs --config-file ./.babel/.mjs.babelrc $@" \
    "yarn ets:babel build/out/ --out-dir build/cjs/ --out-file-extension .cjs --config-file ./.babel/.cjs.babelrc $@"
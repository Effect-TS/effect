#!/bin/bash

# install dependencies
direnv allow
corepack install
pnpm install

# setup repositories
git clone --depth 1 https://github.com/effect-ts/effect-smol.git .repos/effect-v4

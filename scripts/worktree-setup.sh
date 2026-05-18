#!/bin/bash

# install dependencies
direnv allow
corepack install
pnpm install

# setup repositories
git clone https://github.com/effect-ts/effect-smol.git .repos/effect-v4

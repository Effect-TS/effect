#!/bin/bash

# install dependencies
direnv allow
corepack install
pnpm install

# setup repositories
git clone --depth 1 https://github.com/effect-ts/effect-smol.git .repos/effect-v4

cat << EOF >> AGENTS.md

## Learning about "effect" v4

If you need to learn more about the new version of effect (version 4), you can
access the repository here:

\`.repos/effect-v4\`
EOF

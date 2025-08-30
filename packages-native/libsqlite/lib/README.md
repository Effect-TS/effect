This directory contains prebuilt libsqlite3 shared libraries committed to git for convenience during early development.

Expected structure:
- darwin-aarch64/libsqlite3.dylib
- darwin-x86_64/libsqlite3.dylib
- linux-x86_64/libsqlite3.so
- linux-aarch64/libsqlite3.so

To populate for the current host:
1) nix build .#libsqlite3
2) node scripts/collect-libsqlite.mjs
3) git add packages-native/libsqlite/lib && git commit -m "Add libsqlite3 for <platform>"

Loadable extensions: builds are configured with -DSQLITE_ENABLE_LOAD_EXTENSION and --enable-load-extension.


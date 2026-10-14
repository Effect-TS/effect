---
"effect": patch
---

Add `effect/encoding/Tar`, a streaming tar codec. `Tar.decode()` turns archive bytes into entries whose bodies stream straight from the input, reading v7, USTAR, PAX and GNU archives. `Tar.encode()` writes entries as USTAR, with PAX extended headers only where needed, and `Tar.file`, `Tar.fileStream`, `Tar.directory`, `Tar.symlink` and `Tar.hardlink` build entries with reproducible defaults.

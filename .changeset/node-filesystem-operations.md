---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Add one layer per `FileSystem` operation to `NodeFileSystem` and `BunFileSystem` (`NodeFileSystem.readFile`, …), so a program bundles only the operations it provides, plus `FileSystem.layerExists`, `layerGlob`, `layerReadFileString`, `layerStream`, `layerSink` and `layerWriteFileString`.

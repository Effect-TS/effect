---
"effect": minor
---

`effect/FileSystem` exports one operation per member (`FileSystem.readFile(path)`, `Effect.provideService(FileSystem.readFile, fake)`), all satisfied by any `Layer<FileSystem>`, and `FileSystem.Shape` as the name of the record type. Write `FileSystem.Shape` where you use `FileSystem.FileSystem` as the type of an implementation; the next minor makes `FileSystem.FileSystem` the identity of the whole service. The `[TypeId]` brand is gone from the interface; nothing read it.

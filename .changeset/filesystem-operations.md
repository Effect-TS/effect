---
"effect": minor
---

**Breaking** (`@stability unstable`): `effect/FileSystem` is a record service over one operation per member. Each member is exported as a key that is called like a function (`FileSystem.readFile(path)`), provided alone (`Layer.succeed(FileSystem.readFile, impl)`) and overridden alone (`Effect.provideService(FileSystem.readFile, fake)`); any `Layer<FileSystem>` satisfies every operation, and the merge of the operations' layers is a `Layer<FileSystem>`. `FileSystem.ReadOnly` is a record service over the ten reading operations, for programs that only read.

The _type_ `FileSystem.FileSystem` is now the identity of the whole service (the union of its 32 operation keys), not the record of implementations: code that used it as the type of an implementation writes `FileSystem.Shape` (`pnpm codemod:shape --module FileSystem <paths>` rewrites it). Requirements, layers, `make`, `makeNoop` and `layerNoop` are unchanged; `yield* FileSystem.FileSystem` returns a plain object of the operations' implementations rather than the object the layer provided. `FileSystem.Shape` is derived from the operations. The `[TypeId]` brand is gone from the record; nothing read it.

---
"effect": patch
---

Add the `IgnoreFile` module for matching paths against `.gitignore` and `.dockerignore` rules, and an `ignore` option on `FileSystem.glob` that filters a walk with them.

```ts
import { Effect, FileSystem, IgnoreFile, Result } from "effect"

const program = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const source = yield* fs.readFileString("context/.dockerignore")
  const ignore = Result.getOrThrow(IgnoreFile.dockerignore(source))
  return yield* fs.glob("**", { root: "context", dot: true, ignore })
})
```

---
"effect": patch
---

Add the `Ignore` module for matching paths against `.gitignore` and `.dockerignore` rules, and an `ignore` option on `FileSystem.glob` that filters a walk with them.

```ts
import { Effect, FileSystem, Ignore, Result } from "effect"

const program = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const source = yield* fs.readFileString("context/.dockerignore")
  const ignore = Result.getOrThrow(Ignore.dockerignore(source))
  return yield* fs.glob("**", { root: "context", dot: true, ignore })
})
```

`Glob.make` no longer throws for a class name that matches an `Object.prototype` property, such as `[[:toString:]]`; it is read as an unknown class.

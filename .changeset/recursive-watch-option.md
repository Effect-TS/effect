---
"@effect/platform": patch
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
---

feat(platform): add recursive option to FileSystem.watch

Added a `recursive` option to `FileSystem.watch` that allows watching for changes in subdirectories. When set to `true`, the watcher will monitor changes in all nested directories.

Note: The recursive option is only supported on macOS and Windows. On other platforms, it will be ignored.

Example:
```ts
import { FileSystem } from "@effect/platform"
import { Effect, Stream } from "effect"

Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  
  // Watch directory and all subdirectories
  yield* fs.watch("src", { recursive: true }).pipe(
    Stream.runForEach(console.log)
  )
})
```
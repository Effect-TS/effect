---
"@effect/platform-node-shared": patch
"@effect/platform": patch
---

add .watch method to /platform FileSystem

It can be used to listen for file system events. Example:

```ts
import { FileSystem } from "@effect/platform";
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { Console, Effect, Stream } from "effect";

Effect.gen(function* (_) {
  const fs = yield* _(FileSystem.FileSystem);
  yield* _(fs.watch("./"), Stream.runForEach(Console.log));
}).pipe(Effect.provide(NodeFileSystem.layer), NodeRuntime.runMain);
```

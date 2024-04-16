---
"@effect/platform-node-shared": patch
"@effect/platform": patch
---

allow fs.watch backend to be customized

If you want to use the @parcel/watcher backend, you now need to provide it to
your effects.

```ts
import { Layer } from "effect"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import * as ParcelWatcher from "@effect/platform-node/NodeFileSystem/ParcelWatcher"

// create a Layer that uses the ParcelWatcher backend
NodeFileSystem.layer.pipe(Layer.provide(ParcelWatcher.layer))
```

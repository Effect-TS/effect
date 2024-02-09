---
"@effect/platform-browser": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform": minor
---

move where platform worker spawn function is provided

With this change, the point in which you provide the spawn function moves closer
to the edge, where you provide platform specific implementation.

This seperates even more platform concerns from your business logic. Example:

```ts
import { Worker } from "@effect/platform"
import { BrowserWorker } from "@effect/platform-browser"
import { Effect } from "effect"

Worker.makePool({ ... }).pipe(
  Effect.provide(BrowserWorker.layer(() => new globalThis.Worker(...)))
)
```

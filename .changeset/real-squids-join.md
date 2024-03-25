---
"@effect/platform-node-shared": patch
---

add NodeStream.toReadable

With this api you can convert an Effect Stream into a node.js Readable stream.

```ts
import { Stream } from "effect";
import * as NodeStream from "@effect/platform-node/NodeStream";

// Effect<Readable>
NodeStream.toReadable(Stream.make("a", "b", "c"));
```

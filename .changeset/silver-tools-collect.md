---
"effect": patch
---

added Stream.mergeWithTag

Combines a struct of streams into a single stream of tagged values where the tag is the key of the struct.

```ts
import { Stream } from "effect"

// Stream.Stream<{ _tag: "a"; value: number; } | { _tag: "b"; value: string; }>
const stream = Stream.mergeWithTag(
  {
    a: Stream.make(0),
    b: Stream.make("")
  },
  { concurrency: 1 }
)
```

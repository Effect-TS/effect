---
"effect": minor
---

add Stream.toAsyncIterable\* apis

```ts
import { Stream } from "effect"

// Will print:
// 1
// 2
// 3
const stream = Stream.make(1, 2, 3)
for await (const result of Stream.toAsyncIterable(stream)) {
  console.log(result)
}
```

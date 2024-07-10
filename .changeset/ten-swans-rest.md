---
"effect": minor
---

allow customizing the output buffer for the Stream.async\* apis

```ts
import { Stream } from "effect";

Stream.async<string>(
  (emit) => {
    // ...
  },
  {
    bufferSize: 16,
    strategy: "dropping", // you can also use "sliding" or "suspend"
  },
);
```

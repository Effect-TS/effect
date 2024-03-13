---
"effect": patch
---

add support for AbortSignal's to runPromise

If the signal is aborted, the effect execution will be interrupted.

```ts
import { Effect } from "effect";

const controller = new AbortController();

Effect.runPromise(Effect.never, { signal: controller.signal });

// abort after 1 second
setTimeout(() => controller.abort(), 1000);
```

---
"effect": patch
---

add overload to Effect.filterOrFail that fails with NoSuchElementException

This allows you to perform a filterOrFail without providing a fallback failure
function.

Example:

```ts
import { Effect } from "effect";

// fails with NoSuchElementException
Effect.succeed(1).pipe(Effect.filterOrFail((n) => n === 0));
```

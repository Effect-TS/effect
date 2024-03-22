---
"@effect/experimental": patch
---

add TimeToLive module to @effect/experimental

A trait for attaching expiry information to objects.

```ts
import * as TimeToLive from "@effect/experimental";
import { Duration, Exit } from "effect";

class User {
  [TimeToLive.symbol](exit: Exit.Exit<unknown, unknown>) {
    return Exit.isSuccess(exit) ? Duration.seconds(60) : Duration.zero;
  }
}
```

---
"effect": patch
---

Add Config.duration

This can be used to parse Duration's from environment variables:

```ts
import { Config, Effect } from "effect"

Config.duration("CACHE_TTL").pipe(
  Effect.andThen((duration) => ...)
)
```

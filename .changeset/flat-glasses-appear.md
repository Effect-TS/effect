---
"effect": patch
---

Prohibit name clashes in Effect.Tag

The following now correctly flags a type error given that the property `context` exists already in `Tag`:

```ts
import { Effect } from "effect"

class LoaderArgs extends Effect.Tag("@services/LoaderContext")<
  LoaderArgs,
  { context: number }
>() {}
```

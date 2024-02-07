---
"@effect/schema": minor
---

Fix usage of Schema.TaggedError in combination with Unify.

When used with Unify we previously had:

```ts
import { Schema } from "@effect/schema";
import type { Unify } from "effect";

class Err extends Schema.TaggedError<Err>()("Err", {}) {}

// $ExpectType Effect<unknown, unknown, unknown>
export type IdErr = Unify.Unify<Err>;
```

With this fix we now have:

```ts
import { Schema } from "@effect/schema";
import type { Unify } from "effect";

class Err extends Schema.TaggedError<Err>()("Err", {}) {}

// $ExpectType Err
export type IdErr = Unify.Unify<Err>;
```

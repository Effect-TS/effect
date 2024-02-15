---
"effect": minor
---

Remove Effect.unified and Effect.unifiedFn in favour of Unify.unify.

The `Unify` module fully replaces the need for specific unify functions, when before you did:

```ts
import { Effect } from "effect";

const effect = Effect.unified(
  Math.random() > 0.5 ? Effect.succeed("OK") : Effect.fail("NO")
);
const effectFn = Effect.unifiedFn((n: number) =>
  Math.random() > 0.5 ? Effect.succeed("OK") : Effect.fail("NO")
);
```

You can now do:

```ts
import { Effect, Unify } from "effect";

const effect = Unify.unify(
  Math.random() > 0.5 ? Effect.succeed("OK") : Effect.fail("NO")
);
const effectFn = Unify.unify((n: number) =>
  Math.random() > 0.5 ? Effect.succeed("OK") : Effect.fail("NO")
);
```

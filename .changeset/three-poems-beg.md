---
"effect": minor
---

use LazyArg for Effect.if branches

Instead of:

```ts
Effect.if(true, {
  onTrue: Effect.succeed("true"),
  onFalse: Effect.succeed("false"),
});
```

You should now write:

```ts
Effect.if(true, {
  onTrue: () => Effect.succeed("true"),
  onFalse: () => Effect.succeed("false"),
});
```

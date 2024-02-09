---
"@effect/platform-node-shared": minor
"@effect/platform-browser": minor
"@effect/opentelemetry": minor
"@effect/platform-node": minor
"@effect/experimental": minor
"@effect/platform-bun": minor
"@effect/platform": minor
"@effect/rpc-http": minor
"effect": minor
"@effect/schema": minor
"@effect/cli": minor
"@effect/rpc": minor
---

With this change we now require a string key to be provided for all tags and renames the dear old `Tag` to `GenericTag`, so when previously you could do:

```ts
import { Effect, Context } from "effect";
interface Service {
  readonly _: unique symbol;
}
const Service = Context.Tag<
  Service,
  {
    number: Effect.Effect<never, never, number>;
  }
>();
```

you are now mandated to do:

```ts
import { Effect, Context } from "effect";
interface Service {
  readonly _: unique symbol;
}
const Service = Context.GenericTag<
  Service,
  {
    number: Effect.Effect<never, never, number>;
  }
>("Service");
```

This makes by default all tags globals and ensures better debuggaility when unexpected errors arise.

Furthermore we introduce a new way of constructing tags that should be considered the new default:

```ts
import { Effect, Context } from "effect";
class Service extends Context.Tag("Service")<
  Service,
  {
    number: Effect.Effect<never, never, number>;
  }
>() {}

const program = Effect.flatMap(Service, ({ number }) => number).pipe(
  Effect.flatMap((_) => Effect.log(`number: ${_}`))
);
```

this will use "Service" as the key and will create automatically an opaque identifier (the class) to be used at the type level, it does something similar to the above in a single shot.

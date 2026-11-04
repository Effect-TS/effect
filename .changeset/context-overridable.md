---
"effect": minor
---

Add `Context.overridable` for tree-shakeable operations whose implementation can be swapped through the context.

Each operation is a module-level `Effect`, `Stream`, or function returning either, with a default implementation. A bundler drops the modules a program never imports, which a property on a service object cannot offer. Overrides go through `.reference` with the usual key APIs, and the lookup happens when the operation runs.

```ts
import { Context, Effect } from "effect"

export const greet = Context.overridable(
  "app/greet",
  (name: string) => Effect.succeed(`Hello, ${name}`)
)

const program = greet("Effect")

await Effect.runPromise(program) // "Hello, Effect"
await Effect.runPromise(
  program.pipe(Effect.provideService(greet.reference, (name) => Effect.succeed(`Hi, ${name}`)))
) // "Hi, Effect"
```

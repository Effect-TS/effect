---
"effect": patch
---

Schedule: fix unsafe `tapOutput` signature.

Previously, `tapOutput` allowed using an output type that wasn't properly inferred, leading to potential runtime errors. Now, TypeScript correctly detects mismatches at compile time, preventing unexpected crashes.

**Before (Unsafe, Causes Runtime Error)**

```ts
import { Effect, Schedule, Console } from "effect"

const schedule = Schedule.once.pipe(
  Schedule.as<number | string>(1),
  Schedule.tapOutput((s: string) => Console.log(s.trim())) // ❌ Runtime error
)

Effect.runPromise(Effect.void.pipe(Effect.schedule(schedule)))
// throws: TypeError: s.trim is not a function
```

**After (Safe, Catches Type Error at Compile Time)**

```ts
import { Console, Schedule } from "effect"

const schedule = Schedule.once.pipe(
  Schedule.as<number | string>(1),
  // ✅ Type Error: Type 'number' is not assignable to type 'string'
  Schedule.tapOutput((s: string) => Console.log(s.trim()))
)
```

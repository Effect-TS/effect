# Error Handling: `catch*` Renamings

The `catch` combinators on `Effect` have been renamed in v4. The general
pattern: `catchAll*` is shortened to `catch*`, and the `catchSome*` family is
replaced by `catchFilter` / `catchCauseFilter`.

## Renamings

| v3                       | v4                             |
| ------------------------ | ------------------------------ |
| `Effect.catchAll`        | `Effect.catch`                 |
| `Effect.catchAllCause`   | `Effect.catchCause`            |
| `Effect.catchAllDefect`  | `Effect.catchDefect`           |
| `Effect.catchTag`        | `Effect.catchTag` (unchanged)  |
| `Effect.catchTags`       | `Effect.catchTags` (unchanged) |
| `Effect.catchIf`         | `Effect.catchIf` (unchanged)   |
| `Effect.catchSome`       | `Effect.catchFilter`           |
| `Effect.catchSomeCause`  | `Effect.catchCauseFilter`      |
| `Effect.catchSomeDefect` | Removed                        |

## `Effect.catchAll` → `Effect.catch`

**v3**

```ts
import { Effect } from "effect"

const program = Effect.fail("error").pipe(
  Effect.catchAll((error) => Effect.succeed(`recovered: ${error}`))
)
```

**v4**

```ts
import { Effect } from "effect"

const program = Effect.fail("error").pipe(
  Effect.catch((error) => Effect.succeed(`recovered: ${error}`))
)
```

## `Effect.catchAllCause` → `Effect.catchCause`

**v3**

```ts
import { Effect } from "effect"

const program = Effect.die("defect").pipe(
  Effect.catchAllCause((cause) => Effect.succeed("recovered"))
)
```

**v4**

```ts
import { Cause, Effect } from "effect"

const program = Effect.die("defect").pipe(
  Effect.catchCause((cause) => Effect.succeed("recovered"))
)
```

## `Effect.catchSome` → `Effect.catchFilter`

In v3, `catchSome` took a function returning `Option<Effect>`. In v4,
`catchFilter` uses the `Filter` module instead.

**v3**

```ts
import { Effect, Option } from "effect"

const program = Effect.fail(42).pipe(
  Effect.catchSome((error) =>
    error === 42
      ? Option.some(Effect.succeed("caught"))
      : Option.none()
  )
)
```

**v4**

```ts
import { Effect, Filter } from "effect"

const program = Effect.fail(42).pipe(
  Effect.catchFilter(
    Filter.fromPredicate((error: number) => error === 42),
    (error) => Effect.succeed("caught")
  )
)
```

## Defects Take Precedence in Mixed Causes

A failure cause can hold a typed error and a defect at the same time, for
example when a finalizer dies after the effect has already failed. In v4,
every operator that recovers from typed errors skips such causes. The handler
does not run, and the failure is propagated with each typed error converted to
a defect.

In v3 only some operators behaved this way (`catchAll`, `matchEffect`,
`match`, `orElse`, `orElseSucceed`, `ignore`, `either`, `option` and
`Effect.retry`). `catchTag`, `catchTags`, `catchIf`, `catchSome` and the
`Stream` and `Channel` recovery operators ran the handler and dropped the
defect. In v4 the rule is the same for all of them:

- `Effect`: `catch`, `catchTag`, `catchTags`, `catchIf`, `catchFilter`,
  `catchReason`, `catchReasons`, `catchEager`, `matchEffect`, `match`,
  `matchEager`, `orElseSucceed`, `ignore`, `option`, `result`, `orDie`,
  `eventually`, `firstSuccessOf`, `retry`, `retryOrElse`, `repeat` and
  `repeatOrElse`
- `Stream` and `Channel`: `catch`, `catchTag`, `catchTags`, `catchIf`,
  `catchFilter`, `catchReason`, `catchReasons`, `orElseSucceed`, `ignore`,
  `result`, `orDie` and `retry`

An interruption alongside a typed error does not prevent recovery.

```ts
import { Effect } from "effect"

const program = Effect.fail("error").pipe(
  Effect.ensuring(Effect.die("finalizer defect")),
  // The handler does not run: the cause contains a defect
  Effect.catch(() => Effect.succeed("recovered"))
)
// fails with Die("error") + Die("finalizer defect")
```

Use `Effect.catchDefect` or `Effect.catchCause` to recover from causes that
contain defects.

## New in v4

- **`Effect.catchReason(errorTag, reasonTag, handler)`** — catches a specific
  `reason` within a tagged error without removing the parent error from the
  error channel. Useful for handling nested error causes (e.g. an `AiError`
  with a `reason: RateLimitError | QuotaExceededError`).
- **`Effect.catchReasons(errorTag, cases)`** — like `catchReason` but handles
  multiple reason tags at once via an object of handlers.
- **`Effect.catchEager(handler)`** — an optimization variant of `catch` that
  evaluates synchronous recovery effects immediately.

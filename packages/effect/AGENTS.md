# EFFECT CORE PACKAGE

## OVERVIEW

Core Effect library: typed computations, streams, schema validation, dependency injection.

## STRUCTURE

```
effect/
├── src/
│   ├── *.ts             # Public API (~140 modules)
│   ├── internal/        # Implementation (never import)
│   │   ├── opCodes/     # Discriminated union tags
│   │   ├── stm/         # STM implementation
│   │   └── ...
│   └── .index.ts        # Internal re-exports
├── test/                # Vitest tests
└── dtslint/             # Type-level tests (tstyche)
```

## WHERE TO LOOK

| Task              | Location                               | Notes                          |
| ----------------- | -------------------------------------- | ------------------------------ |
| Main Effect type  | `src/Effect.ts`                        | 14k LOC, all Effect operations |
| Stream operations | `src/Stream.ts` + `internal/stream.ts` | Pull-based streaming           |
| Schema validation | `src/Schema.ts` + `src/SchemaAST.ts`   | Bidirectional codecs           |
| Fiber runtime     | `internal/fiberRuntime.ts`             | Execution engine               |
| STM primitives    | `internal/stm/*.ts`                    | TRef, TQueue, TMap, etc        |

## CORE TYPES

```typescript
Effect<A, E, R> // Success A, Error E, Context R
Stream<A, E, R> // Pull-based lazy stream
Schema<A, I, R> // Type A, Encoded I, Context R
Layer<ROut, E, RIn> // Dependency construction
Context<R> // Type-safe service container
```

## CONVENTIONS

### Variance Markers

```typescript
readonly _A: Types.Covariant<A>
readonly _E: Types.Covariant<E>
readonly _R: Types.Contravariant<R>
```

### TypeId Pattern

```typescript
export const TypeId: unique symbol = Symbol.for("effect/MyType")
export type TypeId = typeof TypeId
```

### Generator Protocol

All Effect types implement `[Symbol.iterator]` for `Effect.gen`:

```typescript
Effect.gen(function* () {
  const a = yield* someEffect
  const b = yield* anotherEffect
  return a + b
})
```

## ANTI-PATTERNS

- **No direct internal imports** - Use public re-exports only
- **No `any`/`as`/`!`** - Type safety is paramount
- **No throwing** - Return errors in Effect channel
- **No mutation** - All data structures immutable

## LARGE FILES

| File                       | LOC    | Purpose                   |
| -------------------------- | ------ | ------------------------- |
| `Effect.ts`                | 14,809 | Core computation type     |
| `Schema.ts`                | 10,914 | Validation/codec system   |
| `internal/stream.ts`       | 8,801  | Stream implementation     |
| `Micro.ts`                 | 4,405  | Lightweight Effect subset |
| `internal/fiberRuntime.ts` | 3,842  | Fiber execution engine    |

## TESTING

```typescript
import { it, describe } from "@effect/vitest"
import { Effect, TestClock } from "effect"

it.effect("uses TestClock", () =>
  Effect.gen(function* () {
    yield* TestClock.adjust("1 second")
    // assertions
  })
)
```

## NOTES

- `Micro` is subset of Effect for smaller bundles
- `Channel` is primitive underlying Stream/Sink
- `Cause` preserves full error trace (never loses info)
- `FiberRef` is fiber-local storage (like ThreadLocal)

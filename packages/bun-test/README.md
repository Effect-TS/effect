# @effect/bun-test

Effect test utilities for Bun's test runner.

## Installation

```bash
bun add @effect/bun-test
```

## Usage

```typescript
import { describe, effect, expect, it, layer, live, scoped } from "@effect/bun-test"
import { Effect, Layer } from "effect"

describe("my test suite", () => {
  it.effect("test with Effect", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed(1)
      expect(result).toBe(1)
    })
  )
})
```

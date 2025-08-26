# @effect-native/bun-test

A set of testing utilities for Effect-TS with Bun test runner.

## Installation

```bash
bun add @effect-native/bun-test
```

## Usage

```ts
import { describe, expect, it } from "@effect-native/bun-test"
import { Effect } from "effect"

describe("My Effect Tests", () => {
  it.effect("should run an effect", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed(42)
      expect(result).toBe(42)
    })
  )

  it.scoped("should run a scoped effect", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed("hello")
      expect(result).toBe("hello")
    })
  )

  it.live("should run without test services", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed(true)
      expect(result).toBe(true)
    })
  )
})
```

## Features

- Full Effect-TS integration with Bun test runner
- Support for scoped effects and resource management
- Property-based testing with FastCheck
- Layer composition for dependency injection
- Test services for controlled testing environments

## License

MIT
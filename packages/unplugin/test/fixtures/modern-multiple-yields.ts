// Modern pattern with multiple yields
import { Effect } from "effect"

export const program = Effect.gen(function*() {
  const result = yield* Effect.succeed(1)
  const a = yield* Effect.succeed(2)
  const b = yield* Effect.succeed(3)
  return result + a + b
})

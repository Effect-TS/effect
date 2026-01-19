// Multiple yields on same line - should have distinct traces
import { Effect } from "effect"

export const program = Effect.gen(function*(_) {
  const result = yield* _(Effect.succeed(1))
  const a = yield* _(Effect.succeed(2))
  const b = yield* _(Effect.succeed(3))
  return result + a + b
})

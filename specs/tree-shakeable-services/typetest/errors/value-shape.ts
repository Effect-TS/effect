// A value-shaped operation is called with no arguments; its result is the shape with the key added. Passing an
// argument, or yielding the operation itself, is rejected like any other arity or type mistake.
import * as Effect from "effect/Effect"
import * as Terminal from "../../src/Terminal.ts"

export const tooMany = Terminal.columns(80)

export const notYielded = Effect.gen(function*() {
  return yield* Terminal.columns
})

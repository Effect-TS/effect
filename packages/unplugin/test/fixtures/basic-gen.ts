// Basic Effect.gen usage - should transform yield* _() calls
import { Effect } from "effect"

export const program = Effect.gen(function*(_) {
  const user = yield* _(Effect.succeed({ id: 1, name: "John" }))
  yield* _(Effect.log("Got user"))
  return user
})

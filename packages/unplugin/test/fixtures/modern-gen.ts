// Modern Effect.gen usage without adapter parameter
import { Effect } from "effect"

export const program = Effect.gen(function*() {
  const user = yield* Effect.succeed({ id: 1, name: "John" })
  yield* Effect.log("Got user")
  return user
})

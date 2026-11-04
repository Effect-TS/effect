import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// A comment sits between the removed property and its comma.
const Commented = Context.Service<Store>("test/Commented")

export const main = () =>
  Effect.runPromise(
    Effect.provide(
      Commented.useSync((s) => `${s.read()}`),
      // dprint-ignore
      Layer.succeed(Commented, { unused: () => 2 /* comment */, read: () => 1 })
    )
  )

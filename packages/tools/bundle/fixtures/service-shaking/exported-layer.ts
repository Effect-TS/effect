import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// The key stays private, but the exported Layer lets code outside the bundle
// build the Context that holds the provider.
const Exported = Context.Service<Store>("test/Exported")

export const layer = Layer.succeed(Exported, { read: () => 1, unused: () => 2 })

export const main = () => Effect.runPromise(Effect.provide(Exported.useSync((s) => `${s.read()}`), layer))

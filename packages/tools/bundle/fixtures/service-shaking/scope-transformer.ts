import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// The exported transformer provides the service to any Effect the importer
// passes it.
const Scoped = Context.Service<Store>("test/ScopeTransformer")
const layer = Layer.succeed(Scoped, { read: () => 1, unused: () => 2 })

export const supply = Effect.provide(layer)

export const main = () => Effect.runPromise(supply(Scoped.useSync((s) => `${s.read()}`)))

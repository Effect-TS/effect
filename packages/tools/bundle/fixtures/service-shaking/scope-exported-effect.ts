import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// The exported Effect logs inside the provider's scope, so the importer's
// logger sees the Fiber holding the service.
const Scoped = Context.Service<Store>("test/ScopeExportedEffect")
const layer = Layer.succeed(Scoped, { read: () => 1, unused: () => 2 })

export const program = Effect.provide(Scoped.use((s) => Effect.log(s.read())), layer)

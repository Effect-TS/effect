import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// The exported function builds a Layer supplied by the importer with the
// provider's services.
const Scoped = Context.Service<Store>("test/ScopeLayerInput")
const layer = Layer.succeed(Scoped, { read: () => 1, unused: () => 2 })

export const main = (input: Layer.Layer<never>): Promise<number> =>
  Effect.runPromise(Effect.provide(Scoped.useSync((s) => s.read()), Layer.provideMerge(input, layer)))

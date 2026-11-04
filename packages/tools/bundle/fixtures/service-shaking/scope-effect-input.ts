import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// The exported function runs an Effect supplied by the importer inside the
// provider's scope.
const Scoped = Context.Service<Store>("test/ScopeEffectInput")
const layer = Layer.succeed(Scoped, { read: () => 1, unused: () => 2 })

export const main = <A>(input: Effect.Effect<A>): Promise<A> =>
  Effect.runPromise(Effect.provide(Effect.flatMap(Scoped.useSync((s) => s.read()), () => input), layer))

import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// Callbacks that reach their argument through `arguments` instead of a
// declared parameter.
const Consumed = Context.Service<Store>("test/ArgumentsConsumer")
const Released = Context.Service<Store>("test/ArgumentsRelease")

export const main = () => {
  const log: Array<string> = []
  const ReleasedLayer = Layer.effect(
    Released,
    Effect.acquireRelease(
      Effect.sync(() => ({ read: () => 1, unused: () => 2 })),
      function() {
        // oxlint-disable-next-line prefer-rest-params
        const store: Store = arguments[0]
        return Effect.sync(() => log.push(`released ${store.unused()}`))
      }
    )
  )
  const program = Effect.all([
    // oxlint-disable-next-line prefer-rest-params
    Consumed.useSync(function() {
      return (arguments[0] as Store).unused()
    }),
    Released.useSync((s) => s.read())
  ])
  const layers = Layer.mergeAll(Layer.succeed(Consumed, { read: () => 1, unused: () => 2 }), ReleasedLayer)
  return Effect.runPromise(Effect.provide(program, layers)).then((results) => [...results, ...log].join(","))
}

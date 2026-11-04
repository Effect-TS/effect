import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// The acquired value reaches the release callback and a tap callback, which
// both call a method no consumer of the service reads.
const Released = Context.Service<Store>("test/Released")
const Tapped = Context.Service<Store>("test/Tapped")

export const main = () => {
  const log: Array<string> = []
  const ReleasedLayer = Layer.effect(
    Released,
    Effect.acquireRelease(
      Effect.sync(() => ({ read: () => 1, unused: () => 2 })),
      (store) => Effect.sync(() => log.push(`released ${store.unused()}`))
    )
  )
  const TappedLayer = Layer.effect(
    Tapped,
    Effect.sync(() => ({ read: () => 1, unused: () => 2 })).pipe(
      Effect.tap((store) => Effect.sync(() => log.push(`tapped ${store.unused()}`)))
    )
  )
  const program = Effect.all([Released.useSync((s) => s.read()), Tapped.useSync((s) => s.read())])
  return Effect.runPromise(Effect.provide(program, Layer.mergeAll(ReleasedLayer, TappedLayer))).then((reads) =>
    [...reads, ...log].join(",")
  )
}

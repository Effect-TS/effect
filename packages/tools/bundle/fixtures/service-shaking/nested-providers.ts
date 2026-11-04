import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// The removed `unused` method contains another provider whose `b` method is
// removed too.
const Outer = Context.Service<Store>("test/NestedOuter")
const Inner = Context.Service<{ a(): number; b(): number }>("test/NestedInner")

const layer = Layer.succeed(Outer, {
  read: () => 1,
  unused: () =>
    Effect.runSync(Effect.provide(Inner.useSync((s) => s.a()), Layer.succeed(Inner, { a: () => 3, b: () => 4 })))
})

const main = () => Effect.runPromise(Effect.provide(Outer.useSync((s) => `${s.read()}`), layer))

// A closed program: it exports nothing and prints its result.
main().then((output) => console.log(output))

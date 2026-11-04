import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// The service is a Promise. The object literal is its resolved value, not the
// service itself.
const Async = Context.Service<Promise<Store>>("test/Async")

async function make(): Promise<Store> {
  return { read: () => 1, unused: () => 2 }
}

const main = () =>
  Effect.runPromise(
    Effect.provide(
      Async.use((p) => Effect.promise(() => p.then((s) => `${s.read()}`))),
      Layer.succeed(Async, make())
    )
  )

// A closed program: it exports nothing and prints its result.
main().then((output) => console.log(output))

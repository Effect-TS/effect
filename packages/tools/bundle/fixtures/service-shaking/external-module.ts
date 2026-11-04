import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { unusedType } from "./external-helper.ts"

interface Store {
  read(): number
  unused(): number
}

const External = Context.Service<Store>("test/ExternalModule")
const layer = Layer.succeed(External, { read: () => 1, unused: () => 2 })

const main = () =>
  Effect.runPromise(
    Effect.provide(Effect.flatMap(External.useSync((s) => s.read()), () => Effect.sync(unusedType)), layer)
  )

// A closed program: it exports nothing and prints its result.
main().then((output) => console.log(output))

import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}
import { layer as loggerLayer, seen } from "./external-helper.ts"

const External = Context.Service<Store>("test/ExternalModule")
const layer = Layer.succeed(External, { read: () => 1, unused: () => 2 })

// Both bundles import the same external module, so its log is cleared first.
export const main = () => {
  seen.length = 0
  return Effect.runPromise(
    Effect.provide(
      Effect.flatMap(External.useSync((s) => s.read()), () => Effect.log("read")),
      Layer.mergeAll(layer, loggerLayer)
    )
  ).then(() => seen.join(","))
}

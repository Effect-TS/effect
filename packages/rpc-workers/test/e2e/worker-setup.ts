import { runMain } from "@effect/platform-browser/Runtime"
import * as Runner from "@effect/platform-browser/WorkerRunner"
import * as Router from "@effect/rpc-workers/Router"
import * as Server from "@effect/rpc-workers/Server"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Name, schemaWithSetup } from "./schema.js"

const router = Router.make(schemaWithSetup, {
  __setup: (port) =>
    Layer.scoped(
      Name,
      Effect.gen(function*(_) {
        console.log("setup", port)
        yield* _(
          Effect.addFinalizer(() => Effect.sync(() => port.postMessage("closed")))
        )
        return { name: "Tim" }
      })
    ),

  getName: Effect.map(Name, (_) => _.name)
})

Server.make(router).pipe(
  Layer.scopedDiscard,
  Layer.provide(Runner.layerPlatform),
  Layer.launch,
  runMain
)

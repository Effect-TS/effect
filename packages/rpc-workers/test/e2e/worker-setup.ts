import { runMain } from "@effect/platform-browser/BrowserRuntime"
import * as BrowserRunner from "@effect/platform-browser/BrowserWorkerRunner"
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
  Layer.provide(BrowserRunner.layer),
  Layer.launch,
  runMain
)

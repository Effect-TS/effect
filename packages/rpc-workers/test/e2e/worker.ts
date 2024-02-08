import { runMain } from "@effect/platform-browser/BrowserRuntime"
import * as BrowserRunner from "@effect/platform-browser/BrowserWorkerRunner"
import * as Router from "@effect/rpc-workers/Router"
import * as Server from "@effect/rpc-workers/Server"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { schema } from "./schema.js"

const router = Router.make(schema, {
  currentDate: Effect.sync(() => new Date()),
  getBinary: (_) => Effect.succeed(_),
  delayed: (_) => Effect.delay(Effect.succeed(_), Duration.millis(150)),
  crash: Effect.die("boom")
})

Server.make(router).pipe(
  Layer.scopedDiscard,
  Layer.provide(BrowserRunner.layer),
  Layer.launch,
  runMain
)

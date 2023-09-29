import * as Router from "@effect/rpc-webworkers/Router"
import * as Server from "@effect/rpc-webworkers/Server"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { schema } from "./schema"

const router = Router.make(schema, {
  currentDate: Effect.sync(() => new Date()),
  getBinary: (_) => Effect.succeed(_),
  delayed: (_) => Effect.delay(Effect.succeed(_), Duration.millis(150)),
  crash: Effect.die("boom")
})

Effect.runPromise(Server.make(router))

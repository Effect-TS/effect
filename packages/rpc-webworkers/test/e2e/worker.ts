import * as Effect from "@effect/io/Effect"
import * as Server from "@effect/rpc-webworkers/Server"
import * as Router from "@effect/rpc-webworkers/Router"
import { schema } from "./schema"

const router = Router.make(schema, {
  currentDate: Effect.sync(() => new Date()),
  getBinary: (_) => Effect.succeed(_),
  crash: Effect.die("boom"),
})

Effect.runPromise(Server.make(router))

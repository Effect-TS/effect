import * as Router from "@effect/rpc-webworkers/Router"
import * as Server from "@effect/rpc-webworkers/Server"
import { schema } from "./schema"
import * as Effect from "@effect/io/Effect"

const router = Router.make(schema, {
  getBinary: (_) => Effect.succeed(_),
  crash: Effect.die("boom"),
})

Effect.runPromise(Server.make(router))

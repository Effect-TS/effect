import * as Router from "@effect/rpc-webworkers/Router"
import * as Duration from "@effect/data/Duration"
import * as Server from "@effect/rpc-webworkers/Server"
import { schema } from "./schema"
import * as Effect from "@effect/io/Effect"

let count = 1

const router = Router.make(schema, {
  getBinary: _ =>
    Effect.zipRight(
      Effect.log(`Got request: ${count++}`),
      Effect.delay(Effect.succeed(_), Duration.seconds(1)),
    ),
  crash: Effect.die("boom"),
})

Effect.runPromise(Server.make(router))

import * as Router from "@effect/rpc-webworkers/Router"
import * as Server from "@effect/rpc-webworkers/Server"
import { schema } from "./schema"
import * as Effect from "@effect/io/Effect"

const router = Router.make(schema, {
  getBinary: (_) => Effect.succeed(_),
})

const handler = Server.make(router)

self.onmessage = (event) => {
  Effect.runFork(handler(event))
}

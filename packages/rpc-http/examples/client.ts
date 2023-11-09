import * as Http from "@effect/platform/HttpClient"
import * as Client from "@effect/rpc-http/Client"
import { Console, Effect } from "effect"
import { schema } from "./schema.js"

// Create the client
const client = Client.make(
  schema,
  Http.client.fetch().pipe(
    Http.client.mapRequest(Http.request.prependUrl("http://localhost:3000/rpc"))
  )
)

// Use the client
client.getUserIds.pipe(
  Effect.flatMap(Effect.forEach(client.getUser, { batching: true })),
  Effect.tap((users) => Console.log(users)),
  Effect.runFork
)

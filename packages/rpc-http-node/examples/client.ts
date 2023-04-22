import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Client from "@effect/rpc-http-node/Client"
import { schema } from "@effect/rpc-http-node/examples/schema"

// Create the client
const client = Client.make(schema, { url: "http://localhost:3000" })

// Use the client
pipe(
  client.getUserIds,
  Effect.flatMap((ids) => Effect.forEachPar(ids, client.getUser)),
  Effect.tap((users) =>
    Effect.sync(() => {
      console.log(users)
    }),
  ),
  Effect.runFork,
)

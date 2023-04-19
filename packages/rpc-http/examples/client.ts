import { pipe } from "@effect/data/Function"
import * as RpcHttp from "@effect/rpc-http"
import * as Effect from "@effect/io/Effect"
import { schema } from "@effect/rpc-http/examples/schema"
import * as Client from "@effect/rpc/Client"

// Create the client
const client = Client.make(
  schema,
  RpcHttp.resolver.make({
    url: "http://localhost:3000",
  }),
)

// Call the greet method
pipe(client.greet("World"), Effect.tap(Effect.log), Effect.runPromise)

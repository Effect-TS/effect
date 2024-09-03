import { FetchHttpClient, HttpClient, HttpClientRequest } from "@effect/platform"
import { RpcResolver } from "@effect/rpc"
import { HttpRpcResolver } from "@effect/rpc-http"
import { Console, Effect, Stream } from "effect"
import type { UserRouter } from "./router.js"
import { GetUser, GetUserIds } from "./schema.js"

// Create the client
const makeClient = Effect.gen(function*() {
  const client = yield* HttpClient.HttpClient
  return HttpRpcResolver.make<UserRouter>(
    client.pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl("http://localhost:3000/rpc"))
    )
  ).pipe(RpcResolver.toClient)
})

// Use the client
Effect.gen(function*() {
  const client = yield* makeClient
  yield* client(new GetUserIds()).pipe(
    Stream.runCollect,
    Effect.flatMap(Effect.forEach((id) => client(new GetUser({ id })), { batching: true })),
    Effect.tap(Console.log)
  )
}).pipe(
  Effect.provide(FetchHttpClient.layer),
  Effect.runFork
)

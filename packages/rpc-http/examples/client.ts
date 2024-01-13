import * as Http from "@effect/platform/HttpClient"
import { Resolver } from "@effect/rpc"
import { HttpResolver } from "@effect/rpc-http"
import { Console, Effect, Stream } from "effect"
import type { UserRouter } from "./router.js"
import { GetUser, GetUserIds } from "./schema.js"

// Create the client
const client = HttpResolver.make<UserRouter>(
  Http.client.fetchOk().pipe(
    Http.client.mapRequest(Http.request.prependUrl("http://localhost:3000/rpc"))
  )
).pipe(Resolver.toClient)

// Use the client
client(new GetUserIds()).pipe(
  Stream.runCollect,
  Effect.flatMap(Effect.forEach((id) => client(new GetUser({ id })), { batching: true })),
  Effect.tap(Console.log),
  Effect.runFork
)

import { Handler } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpServer"
import {} from "@effect/rpc"
import { HttpServer } from "@effect/rpc-http"
import { Array, Effect, Layer, Stream } from "effect"
import { createServer } from "http"
import { GetUser, GetUserIds, User, UserId } from "./schema.js"

// Implement the RPC server router
const router = Handler.group(
  Handler.stream(GetUserIds, () => Stream.fromIterable(Array.makeBy(1000, UserId))),
  Handler.effect(GetUser, ({ id }) => Effect.succeed(new User({ id, name: "John Doe" })))
)

export type UserRouter = typeof router

// Create the http server
const HttpLive = Http.router.empty.pipe(
  Http.router.post("/rpc", HttpServer.toHttpApp(router)),
  Http.server.serve(Http.middleware.logger),
  Http.server.withLogAddress,
  Layer.provide(NodeHttpServer.server.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(
  NodeRuntime.runMain
)

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpServer"
import { Router, Rpc } from "@effect/rpc"
import { HttpRouter } from "@effect/rpc-http"
import { Effect, Layer, Stream } from "effect"
import { createServer } from "http"
import { GetUser, GetUserIds, User, UserId } from "./schema.js"

// Implement the RPC server router
const router = Router.make(
  Rpc.stream(GetUserIds, () => Stream.fromIterable([UserId(1), UserId(2), UserId(3)])),
  Rpc.effect(GetUser, ({ id }) => Effect.succeed(new User({ id, name: "John Doe" })))
)

export type UserRouter = typeof router

const HttpLive = Http.router.empty.pipe(
  Http.router.post("/rpc", HttpRouter.toHttpApp(router)),
  Http.server.serve(Http.middleware.logger),
  Http.server.withLogAddress,
  Layer.provide(
    NodeHttpServer.server.layer(createServer, {
      port: 3000
    })
  )
)

// Create the HTTP, which can be served with the platform HTTP server.
Layer.launch(HttpLive).pipe(
  NodeRuntime.runMain
)

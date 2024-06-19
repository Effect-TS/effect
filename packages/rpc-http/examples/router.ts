import { HttpMiddleware, HttpRouter, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Router, Rpc } from "@effect/rpc"
import { HttpRouter as RpcHttpRouter } from "@effect/rpc-http"
import { Array, Effect, Layer, Stream } from "effect"
import { createServer } from "http"
import { GetUser, GetUserIds, User, UserId } from "./schema.js"

// Implement the RPC server router
const router = Router.make(
  Rpc.stream(GetUserIds, () => Stream.fromIterable(Array.makeBy(1000, UserId.make))),
  Rpc.effect(GetUser, ({ id }) => Effect.succeed(new User({ id, name: "John Doe" })))
)

export type UserRouter = typeof router

// Create the http server
const HttpLive = HttpRouter.empty.pipe(
  HttpRouter.post("/rpc", RpcHttpRouter.toHttpApp(router)),
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(
  NodeRuntime.runMain
)

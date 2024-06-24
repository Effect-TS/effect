import { HttpMiddleware, HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "http"

class UserRouter extends HttpRouter.Tag("UserRouter")<UserRouter>() {}

const GetUsers = UserRouter.use((router) =>
  Effect.gen(function*() {
    yield* router.get("/", HttpServerResponse.text("got users"))
  })
)

const CreateUser = UserRouter.use((router) =>
  Effect.gen(function*() {
    yield* router.post("/", HttpServerResponse.text("created user"))
  })
)

const AllRoutes = Layer.mergeAll(GetUsers, CreateUser)

const ServerLive = NodeHttpServer.layer(createServer, { port: 3000 })

const HttpLive = UserRouter.unwrap(HttpServer.serve(HttpMiddleware.logger)).pipe(
  Layer.provide(AllRoutes),
  Layer.provide(ServerLive)
)

NodeRuntime.runMain(Layer.launch(HttpLive))

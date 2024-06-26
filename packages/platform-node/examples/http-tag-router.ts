import { HttpMiddleware, HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "http"

// You can define router instances using `HttpRouter.Tag`
class UserRouter extends HttpRouter.Tag("UserRouter")<UserRouter>() {}

// Create `Layer`'s for your routes with `UserRouter.use`
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

// Merge all the routes together with `Layer.mergeAll`
const AllUserRoutes = Layer.mergeAll(GetUsers, CreateUser).pipe(
  Layer.provideMerge(UserRouter.Live)
)

// `HttpRouter.Default` can also be used. Here we combine our `UserRouter` with
// the default router.
const AllRoutes = HttpRouter.Default.use((router) =>
  Effect.gen(function*() {
    yield* router.mount("/users", yield* UserRouter.router)
  })
).pipe(Layer.provide(AllUserRoutes))

const ServerLive = NodeHttpServer.layer(createServer, { port: 3000 })

// use the `.unwrap` api to turn the underlying `HttpRouter` into another layer.
// Here we use `HttpServer.serve` to create a server from the `HttpRouter`.
const HttpLive = HttpRouter.Default.unwrap(HttpServer.serve(HttpMiddleware.logger)).pipe(
  Layer.provide(AllRoutes),
  Layer.provide(ServerLive)
)

NodeRuntime.runMain(Layer.launch(HttpLive))

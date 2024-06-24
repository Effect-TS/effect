import { HttpMiddleware, HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer } from "effect"

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

const ServerLive = BunHttpServer.layer({ port: 3000 })

const HttpLive = Layer.unwrapEffect(Effect.gen(function*() {
  return HttpServer.serve(yield* UserRouter.router, HttpMiddleware.logger)
})).pipe(
  Layer.provide(UserRouter.Live),
  Layer.provide(AllRoutes),
  Layer.provide(ServerLive)
)

BunRuntime.runMain(Layer.launch(HttpLive))

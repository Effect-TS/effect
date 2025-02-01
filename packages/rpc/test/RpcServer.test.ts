import * as NodeSocketServer from "@effect/experimental/SocketServer/Node"
import { HttpClient, HttpClientRequest, HttpRouter, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeSocket } from "@effect/platform-node"
import { Rpc, RpcClient, RpcGroup, RpcMiddleware, RpcSchema, RpcSerialization, RpcServer } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Mailbox, Schema, Stream, TestClock } from "effect"

describe("RpcServer", () => {
  const e2eSuite = <E>(name: string, layer: Layer.Layer<UsersClient, E>) => {
    describe.concurrent(name, () => {
      it.effect("should get user", () =>
        Effect.gen(function*() {
          const client = yield* UsersClient
          const user = yield* client.GetUser({ id: "1" })
          assert.instanceOf(user, User)
          assert.deepStrictEqual(user, new User({ id: "1", name: "Logged in user" }))
        }).pipe(Effect.provide(layer)))

      it.effect("headers", () =>
        Effect.gen(function*() {
          const client = yield* UsersClient
          const user = yield* client.GetUser({ id: "1" })
          assert.instanceOf(user, User)
          assert.deepStrictEqual(user, new User({ id: "1", name: "John" }))
        }).pipe(
          RpcClient.withHeaders({ name: "John" }),
          Effect.provide(layer)
        ))

      it.effect("Stream", () =>
        Effect.gen(function*() {
          const client = yield* UsersClient
          const users: Array<User> = []
          yield* client.StreamUsers({ id: "1" }).pipe(
            Stream.take(5),
            Stream.runForEach((user) =>
              Effect.sync(() => {
                users.push(user)
              })
            ),
            Effect.fork
          )

          // wait for socket to connect
          yield* Effect.async<void>((resume) => {
            setTimeout(() => resume(Effect.void), 100)
          })
          yield* TestClock.adjust(1000)
          assert.deepStrictEqual(users, [new User({ id: "1", name: "John" })])
          yield* TestClock.adjust(4000)
          assert.lengthOf(users, 5)

          const interrupts = yield* client.GetInterrupts({})
          assert.equal(interrupts, 1)
        }).pipe(Effect.provide(layer)))
    })
  }

  // http ndjson
  const HttpNdjsonServer = HttpRouter.Default.serve().pipe(
    Layer.provide(RpcLive),
    Layer.provide(RpcServer.layerProtocolHttp({ path: "/rpc" }))
  )
  const HttpNdjsonClient = UsersClient.layer.pipe(
    Layer.provide(
      RpcClient.layerProtocolHttp({
        url: "",
        transformClient: HttpClient.mapRequest(HttpClientRequest.appendUrl("/rpc"))
      })
    )
  )
  e2eSuite(
    "e2e http ndjson",
    HttpNdjsonClient.pipe(
      Layer.provide(HttpNdjsonServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerNdjson])
    )
  )
  e2eSuite(
    "e2e http msgpack",
    HttpNdjsonClient.pipe(
      Layer.provide(HttpNdjsonServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerMsgPack])
    )
  )

  // websocket
  const HttpWsServer = HttpRouter.Default.serve().pipe(
    Layer.provide(RpcLive),
    Layer.provide(RpcServer.layerProtocolWebsocket({ path: "/rpc" }))
  )
  const HttpWsClient = UsersClient.layer.pipe(
    Layer.provide(RpcClient.layerProtocolSocket),
    Layer.provide(
      Effect.gen(function*() {
        const server = yield* HttpServer.HttpServer
        const address = server.address as HttpServer.TcpAddress
        return NodeSocket.layerWebSocket(`http://127.0.0.1:${address.port}/rpc`)
      }).pipe(Layer.unwrapEffect)
    )
  )
  e2eSuite(
    "e2e ws ndjson",
    HttpWsClient.pipe(
      Layer.provide(HttpWsServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerNdjson])
    )
  )
  e2eSuite(
    "e2e ws json",
    HttpWsClient.pipe(
      Layer.provide(HttpWsServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerJson])
    )
  )
  e2eSuite(
    "e2e ws msgpack",
    HttpWsClient.pipe(
      Layer.provide(HttpWsServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerMsgPack])
    )
  )

  // tcp
  const TcpServer = RpcLive.pipe(
    Layer.provide(RpcServer.layerProtocolSocketServer),
    Layer.provideMerge(NodeSocketServer.layer({ port: 0 }))
  )
  const TcpClient = UsersClient.layer.pipe(
    Layer.provide(RpcClient.layerProtocolSocket),
    Layer.provide(
      Effect.gen(function*() {
        const server = yield* NodeSocketServer.SocketServer
        const address = server.address as NodeSocketServer.TcpAddress
        return NodeSocket.layerNet({ port: address.port })
      }).pipe(Layer.unwrapEffect)
    )
  )
  e2eSuite(
    "e2e tcp ndjson",
    TcpClient.pipe(
      Layer.provide(TcpServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerNdjson])
    )
  )
  e2eSuite(
    "e2e tcp msgpack",
    TcpClient.pipe(
      Layer.provide(TcpServer),
      Layer.provide([NodeHttpServer.layerTest, RpcSerialization.layerMsgPack])
    )
  )
})

class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String
}) {}

class StreamUsers extends Schema.TaggedRequest<StreamUsers>()("StreamUsers", {
  success: RpcSchema.Stream({
    success: User,
    failure: Schema.Never
  }),
  failure: Schema.Never,
  payload: {
    id: Schema.String
  }
}) {}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()("TestMiddleware", {
  provides: CurrentUser
}) {}

const UserRpcs = RpcGroup
  .make(
    Rpc.make("GetUser", {
      success: User,
      payload: { id: Schema.String }
    }),
    StreamUsers,
    Rpc.make("GetInterrupts", {
      success: Schema.Number
    })
  )
  .middleware(AuthMiddleware)

class UsersClient extends Context.Tag("UsersClient")<
  UsersClient,
  RpcClient.RpcClient<RpcGroup.Rpcs<typeof UserRpcs>>
>() {
  static layer = Layer.scoped(UsersClient, RpcClient.make(UserRpcs))
}

const AuthLive = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of((options) =>
    Effect.succeed(
      new User({ id: "1", name: options.headers.name ?? "Logged in user" })
    )
  )
)

const UsersLive = UserRpcs.toLayer(Effect.gen(function*() {
  let interrupts = 0
  return {
    GetUser: (_) => CurrentUser,
    StreamUsers: Effect.fnUntraced(function*(req) {
      const mailbox = yield* Mailbox.make<User>()

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          interrupts++
        })
      )

      yield* mailbox.offer(new User({ id: req.id, name: "John" })).pipe(
        Effect.delay(1000),
        Effect.forever,
        Effect.forkScoped
      )

      return mailbox
    }),
    GetInterrupts: () => Effect.sync(() => interrupts)
  }
}))

const RpcLive = RpcServer.layer(UserRpcs).pipe(
  Layer.provide([
    UsersLive,
    AuthLive
  ])
)

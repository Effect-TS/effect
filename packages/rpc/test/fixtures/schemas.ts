import { RpcTest } from "@effect/rpc"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcMiddleware from "@effect/rpc/RpcMiddleware"
import * as RpcSchema from "@effect/rpc/RpcSchema"
import * as RpcServer from "@effect/rpc/RpcServer"
import { Context, Effect, Layer, Mailbox, Schema } from "effect"

export class User extends Schema.Class<User>("User")({
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

class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()("AuthMiddleware", {
  provides: CurrentUser
}) {}

export const UserRpcs = RpcGroup
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
        Effect.delay(100),
        Effect.forever,
        Effect.forkScoped
      )

      return mailbox
    }),
    GetInterrupts: () => Effect.sync(() => interrupts)
  }
}))

export const RpcLive = RpcServer.layer(UserRpcs).pipe(
  Layer.provide([
    UsersLive,
    AuthLive
  ])
)

export class UsersClient extends Context.Tag("UsersClient")<
  UsersClient,
  RpcClient.RpcClient<RpcGroup.Rpcs<typeof UserRpcs>>
>() {
  static layer = Layer.scoped(UsersClient, RpcClient.make(UserRpcs))
  static layerTest = Layer.scoped(UsersClient, RpcTest.makeClient(UserRpcs)).pipe(
    Layer.provide([UsersLive, AuthLive])
  )
}

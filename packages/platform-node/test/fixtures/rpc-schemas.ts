import { Headers } from "@effect/platform"
import { RpcTest } from "@effect/rpc"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import type { RpcClientError } from "@effect/rpc/RpcClientError"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcMiddleware from "@effect/rpc/RpcMiddleware"
import * as RpcSchema from "@effect/rpc/RpcSchema"
import * as RpcServer from "@effect/rpc/RpcServer"
import { Context, Effect, Layer, Mailbox, Metric, Option, Schema } from "effect"

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

class Unauthorized extends Schema.TaggedError<Unauthorized>("Unauthorized")("Unauthorized", {}) {}

class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()("AuthMiddleware", {
  provides: CurrentUser,
  failure: Unauthorized,
  requiredForClient: true
}) {}

class TimingMiddleware extends RpcMiddleware.Tag<TimingMiddleware>()("TimingMiddleware", {
  wrap: true
}) {}

class GetUser extends Rpc.make("GetUser", {
  success: User,
  payload: { id: Schema.String }
}) {}

export const UserRpcs = RpcGroup.make(
  GetUser,
  Rpc.make("GetUserOption", {
    success: Schema.Option(User),
    payload: { id: Schema.String }
  }),
  Rpc.fromTaggedRequest(StreamUsers),
  Rpc.make("GetInterrupts", {
    success: Schema.Number
  }),
  Rpc.make("GetEmits", {
    success: Schema.Number
  }),
  Rpc.make("ProduceDefect"),
  Rpc.make("Never"),
  Rpc.make("nested.test"),
  Rpc.make("TimedMethod", {
    payload: {
      shouldFail: Schema.Boolean
    },
    success: Schema.Number
  }).middleware(TimingMiddleware),
  Rpc.make("GetTimingMiddlewareMetrics", {
    success: Schema.Struct({
      success: Schema.Number,
      defect: Schema.Number,
      count: Schema.Number
    })
  })
).middleware(AuthMiddleware)

const AuthLive = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of((options) =>
    Effect.succeed(
      new User({ id: options.headers.userid ?? "1", name: options.headers.name ?? "Fallback name" })
    )
  )
)

const rpcSuccesses = Metric.counter("rpc_middleware_success")
const rpcDefects = Metric.counter("rpc_middleware_defects")
const rpcCount = Metric.counter("rpc_middleware_count")
const TimingLive = Layer.succeed(
  TimingMiddleware,
  TimingMiddleware.of((options) =>
    options.next.pipe(
      Effect.tap(Metric.increment(rpcSuccesses)),
      Effect.tapDefect(() => Metric.increment(rpcDefects)),
      Effect.ensuring(Metric.increment(rpcCount))
    )
  )
)

const UsersLive = UserRpcs.toLayer(Effect.gen(function*() {
  let interrupts = 0
  let emits = 0
  return UserRpcs.of({
    GetUser: (_) =>
      CurrentUser.pipe(
        Rpc.fork
      ),
    GetUserOption: Effect.fnUntraced(function*(req) {
      return Option.some(new User({ id: req.id, name: "John" }))
    }),
    StreamUsers: Effect.fnUntraced(function*(req, _) {
      const mailbox = yield* Mailbox.make<User>(0)

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          interrupts++
        })
      )

      yield* mailbox.offer(new User({ id: req.id, name: "John" })).pipe(
        Effect.tap(() => {
          emits++
        }),
        Effect.delay(100),
        Effect.forever,
        Effect.forkScoped
      )

      return mailbox
    }),
    GetInterrupts: () => Effect.sync(() => interrupts),
    GetEmits: () => Effect.sync(() => emits),
    ProduceDefect: () => Effect.die("boom"),
    Never: () => Effect.never.pipe(Effect.onInterrupt(() => Effect.sync(() => interrupts++))),
    "nested.test": () => Effect.void,
    TimedMethod: (_) => _.shouldFail ? Effect.die("boom") : Effect.succeed(1),
    GetTimingMiddlewareMetrics: () =>
      Effect.all({
        defect: Metric.value(rpcDefects).pipe(Effect.map((_) => _.count)),
        success: Metric.value(rpcSuccesses).pipe(Effect.map((_) => _.count)),
        count: Metric.value(rpcCount).pipe(Effect.map((_) => _.count))
      })
  })
}))

export const RpcLive = RpcServer.layer(UserRpcs).pipe(
  Layer.provide([
    UsersLive,
    AuthLive,
    TimingLive
  ])
)

const AuthClient = RpcMiddleware.layerClient(AuthMiddleware, ({ request }) =>
  Effect.succeed({
    ...request,
    headers: Headers.set(request.headers, "name", "Logged in user")
  }))

export class UsersClient extends Context.Tag("UsersClient")<
  UsersClient,
  RpcClient.RpcClient<RpcGroup.Rpcs<typeof UserRpcs>, RpcClientError>
>() {
  static layer = Layer.scoped(UsersClient, RpcClient.make(UserRpcs)).pipe(
    Layer.provide(AuthClient)
  )
  static layerTest = Layer.scoped(UsersClient, RpcTest.makeClient(UserRpcs)).pipe(
    Layer.provide([UsersLive, AuthLive, TimingLive, AuthClient])
  )
}

import {
  ClusterError,
  ClusterSchema,
  Message,
  MessageStorage,
  Reply,
  Runner,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerServer,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc, RpcServer, RpcTest } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Fiber, FiberId, Layer, Option, Schema, Stream, TestClock } from "effect"
import { MemoryLive } from "./fixtures/abandonment.js"
import { makeRequest } from "./fixtures/message-storage.js"

const transient = Cause.interrupt(RpcServer.fiberIdTransientInterrupt)
const caller = Cause.interrupt(RpcServer.fiberIdClientInterrupt)
const cases = [
  ["transient", transient, true],
  ["caller interrupt", caller, false],
  ["sequential caller + transient", Cause.sequential(caller, transient), false],
  ["parallel caller + transient", Cause.parallel(caller, transient), false],
  [
    "composite caller + transient",
    Cause.interrupt(FiberId.combine(RpcServer.fiberIdClientInterrupt, RpcServer.fiberIdTransientInterrupt)),
    false
  ],
  [
    "composite transient + caller",
    Cause.interrupt(FiberId.combine(RpcServer.fiberIdTransientInterrupt, RpcServer.fiberIdClientInterrupt)),
    false
  ],
  ["unrelated interrupt", Cause.interrupt(FiberId.runtime(123, 0)), false],
  ["sequential failure", Cause.sequential(transient, Cause.fail("failure")), false],
  ["parallel failure", Cause.parallel(transient, Cause.fail("failure")), false],
  ["sequential defect", Cause.sequential(transient, Cause.die("defect")), false],
  ["parallel defect", Cause.parallel(transient, Cause.die("defect")), false]
] as const

describe("remote terminal reply classification", () => {
  for (const stream of [false, true]) {
    for (const persisted of [false, true]) {
      for (const [name, cause, retry] of cases) {
        it.effect(`${stream ? "stream" : "unary"}, persisted=${persisted}: ${name}`, () =>
          Effect.gen(function*() {
            const rpc = Rpc.make("Control", { success: Schema.String, error: Schema.String })
            const request = yield* makeRequest({ rpc, payload: undefined })
            const reply = new Reply.ReplyWithContext<typeof rpc>({
              rpc,
              context: Context.empty(),
              reply: new Reply.WithExit({
                id: request.envelope.requestId,
                requestId: request.envelope.requestId,
                exit: Exit.failCause(cause)
              })
            })
            const respond = (message: Message.Incoming<any> | Message.OutgoingRequest<any>) =>
              message._tag === "IncomingRequest" ? message.respond(reply).pipe(Effect.orDie) : Effect.void
            const storage = yield* MessageStorage.MessageStorage
            const handlers = RunnerServer.layerHandlers.pipe(
              Layer.provide(Sharding.layer.pipe(
                Layer.map((context) =>
                  Context.add(context, Sharding.Sharding, {
                    ...Context.get(context, Sharding.Sharding),
                    send: respond,
                    notify: () => Effect.void
                  })
                ),
                Layer.provide(Runners.layerNoop),
                Layer.provide(RunnerHealth.layerNoop),
                Layer.provide(RunnerStorage.layerMemory),
                Layer.provide(ShardingConfig.layerDefaults)
              )),
              Layer.provide(Layer.succeed(MessageStorage.MessageStorage, {
                ...storage,
                registerReplyHandler: respond
              }))
            )
            const client = yield* RpcTest.makeClient(Runners.Rpcs).pipe(Effect.provide(handlers))
            const response = stream
              ? client.Stream({ request: request.envelope, persisted }).pipe(
                Stream.runHead,
                Effect.map((value) => {
                  assert(value._tag === "Some")
                  return value.value
                })
              )
              : client.Effect({ request: request.envelope, persisted })
            const exit = yield* Effect.exit(response)
            if (retry && !persisted) {
              assert(Exit.isFailure(exit), "remote volatile transient interruption must become a routing failure")
              assert.instanceOf(Cause.squash(exit.cause), ClusterError.EntityNotAssignedToRunner)
            } else {
              assert(Exit.isSuccess(exit), "non-routing causes must remain terminal replies")
              assert.deepStrictEqual(exit.value, yield* Reply.serializeOrDefect(reply))
            }
          }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
      }
    }
  }
})

describe("remote routing retry", () => {
  for (const stream of [false, true]) {
    it.effect(`${stream ? "stream" : "unary"}: Sharding retries a transient remote reply with the same request`, () =>
      Effect.gen(function*() {
        const rpc = Rpc.make("Retry", { success: Schema.String }).annotate(ClusterSchema.Persisted, false)
        const request = yield* makeRequest({ rpc, payload: undefined })
        let attempts = 0
        const respond = (message: Message.Incoming<any>) =>
          Effect.gen(function*() {
            if (message._tag !== "IncomingRequest") return
            attempts++
            assert.strictEqual(message.envelope.requestId, request.envelope.requestId)
            yield* message.respond(
              new Reply.ReplyWithContext<typeof rpc>({
                rpc,
                context: Context.empty(),
                reply: new Reply.WithExit({
                  id: request.envelope.requestId,
                  requestId: request.envelope.requestId,
                  exit: attempts === 1 ? Exit.failCause(transient) : Exit.succeed("retried")
                })
              })
            ).pipe(Effect.orDie)
          })
        const server = RunnerServer.layerHandlers.pipe(
          Layer.provide(Sharding.layer.pipe(
            Layer.map((context) =>
              Context.add(context, Sharding.Sharding, {
                ...Context.get(context, Sharding.Sharding),
                send: respond
              })
            ),
            Layer.provide(Runners.layerNoop),
            Layer.provide(RunnerHealth.layerNoop),
            Layer.provide(RunnerStorage.layerMemory),
            Layer.provide(ShardingConfig.layerDefaults)
          ))
        )
        const remote = yield* RpcTest.makeClient(Runners.Rpcs).pipe(Effect.provide(server))
        const noop = yield* Runners.makeNoop.pipe(Effect.provide(ShardingConfig.layerDefaults))
        const runner = Runner.make({ address: RunnerAddress.make("remote", 1234), groups: ["default"], weight: 1 })
        const caller = Sharding.layer.pipe(
          Layer.provide(Layer.succeed(Runners.Runners, {
            ...noop,
            send: ({ message }) =>
              Effect.gen(function*() {
                assert(message._tag === "OutgoingRequest")
                const encoded = yield* Message.serializeRequest(message).pipe(Effect.orDie)
                const reply = yield* (stream
                  ? remote.Stream({ request: encoded, persisted: false }).pipe(
                    Stream.runHead,
                    Effect.map(Option.getOrThrow)
                  )
                  : remote.Effect({ request: encoded, persisted: false }))
                yield* message.respond(
                  yield* Schema.decode(Reply.Reply(message.rpc))(reply).pipe(Effect.provide(message.context)).pipe(
                    Effect.orDie
                  )
                )
              })
          })),
          Layer.provide(
            RunnerStorage.layerMemory.pipe(Layer.map((context) =>
              Context.add(context, RunnerStorage.RunnerStorage, {
                ...Context.get(context, RunnerStorage.RunnerStorage),
                getRunners: Effect.succeed([[runner, true] as const])
              })
            ))
          ),
          Layer.provide(RunnerHealth.layerNoop),
          Layer.provide(
            ShardingConfig.layer({ runnerAddress: Option.none(), shardsPerGroup: 1, sendRetryInterval: 10 })
          )
        )
        yield* Effect.gen(function*() {
          const sharding = yield* Sharding.Sharding
          yield* TestClock.adjust(1)
          let result: Exit.Exit<any, any> | undefined
          const sending = yield* sharding.sendOutgoing(
            new Message.OutgoingRequest({
              ...request,
              respond: (reply) =>
                Effect.sync(() => {
                  if (reply._tag === "WithExit") result = reply.exit
                })
            }),
            false
          ).pipe(Effect.fork)
          yield* TestClock.adjust(100)
          yield* Fiber.join(sending)
          assert.deepStrictEqual(result, Exit.succeed("retried"))
          assert.strictEqual(attempts, 2, "routing retry may re-execute the remote handler")
        }).pipe(Effect.provide(caller))
      }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
  }
})

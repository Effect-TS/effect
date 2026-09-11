import {
  ClusterError,
  ClusterSchema,
  ClusterWorkflowEngine,
  Entity,
  EntityId,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Workflow } from "@effect/workflow"
import {
  Cause,
  Context,
  Effect,
  ExecutionStrategy,
  Exit,
  Fiber,
  FiberRef,
  Layer,
  Mailbox,
  Option,
  Schema,
  Scope,
  Stream,
  TestClock
} from "effect"
import * as Abandon from "../src/internal/clusterAbandon.js"
import { MemoryLive } from "./fixtures/abandonment.js"

describe("workflow send-time abandonment", () => {
  for (const trigger of ["shutdown", "closing manager", "closed manager", "parked waiter"] as const) {
    for (const [path, masked] of [["unary", false], ["unary", true], ["stream", false], ["mailbox", false]] as const) {
      for (const recovery of ["catchAllCause", "exit"] as const) {
        it.effect(`${recovery} cannot complete a workflow after ${path} abandonment during ${trigger} (masked=${masked})`, () =>
          Effect.gen(function*() {
            const driver = yield* MessageStorage.MemoryDriver
            const storage = yield* MessageStorage.MessageStorage
            const handlerEntered = yield* Effect.makeLatch()
            let writer: Fiber.RuntimeFiber<unknown, unknown> | undefined
            let waiter: Fiber.RuntimeFiber<unknown, unknown> | undefined
            const bodyReady = yield* Effect.makeLatch()
            const sendNow = yield* Effect.makeLatch()
            const finalizerEntered = yield* Effect.makeLatch()
            const finishFinalizer = yield* Effect.makeLatch()
            let closing = false
            let routeFailures = 0
            let targetCalls = 0
            let attempts = 0
            let durableFinalizers = 0
            let requesterExit: Exit.Exit<string, unknown> | undefined
            const observed = {
              marked: false,
              interruptOnly: false,
              continued: false,
              interrupted: false,
              insideMask: false,
              pendingInMask: false
            }
            const target = Entity.make("SendAbandonmentTarget", [
              Rpc.make("Ping").annotate(ClusterSchema.Persisted, true),
              Rpc.make("Values", { success: Schema.String, stream: true }).annotate(ClusterSchema.Persisted, true)
            ]).annotate(
              ClusterSchema.ShardGroup,
              (id) => trigger === "closing manager" && id === "late" ? "unassigned" : "default"
            )

            const runners = Layer.effect(
              Runners.Runners,
              Effect.map(Runners.Runners, (runners) =>
                Runners.Runners.of({
                  ...runners,
                  // Inject only the transport routing error. Sharding and RpcClient
                  // must create and propagate abandonment through their real send path.
                  notify: (options) => {
                    assert.isTrue(closing)
                    routeFailures++
                    return Effect.fail(
                      new ClusterError.EntityNotAssignedToRunner({ address: options.message.envelope.address })
                    )
                  }
                }))
            ).pipe(Layer.provide(Runners.layerNoop))
            const engine = ClusterWorkflowEngine.layer.pipe(
              Layer.provideMerge(Sharding.layer),
              Layer.provide(RunnerStorage.layerMemory),
              Layer.provide(RunnerHealth.layerNoop),
              Layer.provide(runners),
              Layer.provide(Layer.succeed(MessageStorage.MessageStorage, {
                ...storage,
                saveRequest: (message) =>
                  Effect.withFiberRuntime((fiber) => {
                    if (
                      message.envelope.address.entityType === target.type &&
                      message.envelope.address.entityId === "late"
                    ) {
                      writer = fiber
                    }
                    return Effect.void
                  }).pipe(Effect.andThen(storage.saveRequest(message))),
                registerReplyHandler: (message) =>
                  Effect.withFiberRuntime((fiber) => {
                    if (
                      message._tag === "OutgoingRequest" && message.envelope.address.entityType === target.type &&
                      message.envelope.address.entityId === "late"
                    ) {
                      waiter = fiber
                    }
                    return storage.registerReplyHandler(message)
                  })
              })),
              Layer.provide(ShardingConfig.layer({
                availableShardGroups: ["default", "unassigned"],
                assignedShardGroups: ["default"],
                shardsPerGroup: 1,
                preemptiveShutdown: trigger === "shutdown",
                entityTerminationTimeout: 0,
                entityMessagePollInterval: 100,
                entityReplyPollInterval: 100,
                refreshAssignmentsInterval: 100,
                sendRetryInterval: 10
              }))
            )
            const context = yield* Layer.build(engine)
            const sharding = Context.get(context, Sharding.Sharding)
            const targetScope = yield* Scope.fork(yield* Effect.scope, ExecutionStrategy.sequential)
            yield* Effect.addFinalizer(() => finishFinalizer.open)
            yield* Layer.build(target.toLayer(Effect.gen(function*() {
              yield* Effect.addFinalizer(() =>
                Effect.gen(function*() {
                  closing = true
                  yield* finalizerEntered.open
                  yield* finishFinalizer.await
                })
              )
              return {
                Ping: ({ address }) =>
                  Effect.gen(function*() {
                    targetCalls++
                    if (address.entityId === "late") {
                      yield* handlerEntered.open
                      yield* Effect.never
                    }
                  }),
                Values: ({ address }) =>
                  Stream.fromEffect(Effect.gen(function*() {
                    targetCalls++
                    if (address.entityId === "late") {
                      yield* handlerEntered.open
                      return yield* Effect.never
                    }
                    return "warm"
                  }))
              }
            }))).pipe(Scope.extend(targetScope), Effect.provide(context))
            yield* TestClock.adjust(1000)
            const client = yield* target.client.pipe(Effect.provide(context))
            const warm = client("warm")
            const warmup = yield* (path === "unary"
              ? warm.Ping()
              : path === "stream"
              ? Stream.runDrain(warm.Values())
              : warm.Values(undefined, { asMailbox: true }).pipe(
                Effect.flatMap((mailbox) => Stream.runDrain(Mailbox.toStream(mailbox)))
              )).pipe(Effect.fork)
            yield* TestClock.adjust(1000)
            yield* Fiber.join(warmup)
            assert.strictEqual(targetCalls, 1)

            const workflow = Workflow.make({
              name: `SendAbandonment/${trigger}/${recovery}/${path}/${masked}`,
              payload: { id: Schema.String },
              success: Schema.String,
              idempotencyKey: ({ id }) => id
            })
            yield* Layer.build(workflow.toLayer(() =>
              Effect.gen(function*() {
                if (++attempts > 1) return yield* Effect.never
                yield* Workflow.addFinalizer(() =>
                  Effect.sync(() => {
                    durableFinalizers++
                  })
                )
                const targetClient = yield* target.client
                yield* bodyReady.open
                yield* sendNow.await
                const remote = targetClient("late")
                const call = path === "unary"
                  ? remote.Ping()
                  : path === "stream"
                  ? Stream.runDrain(remote.Values())
                  : remote.Values(undefined, { asMailbox: true }).pipe(
                    Effect.flatMap((mailbox) => mailbox.take),
                    Effect.asVoid,
                    Workflow.provideScope
                  )
                const request = call.pipe(Effect.tapErrorCause((cause) =>
                  Effect.sync(() => {
                    observed.marked = Abandon.isCause(cause)
                    observed.interruptOnly = Cause.isInterruptedOnly(cause)
                  })
                ))
                const recover = Effect.gen(function*() {
                  if (recovery === "catchAllCause") {
                    yield* request.pipe(Effect.catchAllCause(() => Effect.void))
                  } else {
                    yield* Effect.exit(request)
                  }
                  if (masked) {
                    yield* Effect.withFiberRuntime((fiber) =>
                      Effect.sync(() => {
                        observed.insideMask = true
                        observed.pendingInMask = Abandon.isCause(fiber.getFiberRef(FiberRef.interruptedCause))
                      })
                    )
                  }
                })
                yield* masked ? Effect.uninterruptible(recover) : recover
                yield* Effect.yieldNow()
                yield* Effect.withFiberRuntime((fiber) =>
                  Effect.sync(() => {
                    observed.continued = true
                    observed.interrupted = !Cause.isEmpty(fiber.getFiberRef(FiberRef.interruptedCause))
                  })
                )
                return "continued"
              }).pipe(Effect.onExit((exit) =>
                Effect.sync(() => {
                  requesterExit = exit
                })
              ))
            )).pipe(Effect.provide(context))
            const executionId = yield* workflow.execute({ id: "one" }, { discard: true }).pipe(Effect.provide(context))
            yield* TestClock.adjust(1000)
            yield* bodyReady.await
            assert.strictEqual(attempts, 1)
            assert.isFalse(yield* sharding.isShutdown)

            yield* Effect.gen(function*() {
              if (trigger === "parked waiter") {
                yield* sendNow.open
                yield* handlerEntered.await
                yield* TestClock.adjust(1)
                assert(waiter, "the public RPC write fiber must register a real storage reply waiter")
                assert(
                  Option.isNone(yield* Fiber.poll(waiter)),
                  "the RPC write fiber must be parked before abandonment"
                )
                assert.isUndefined(requesterExit)
                yield* storage.unregisterShardReplyHandlers(sharding.getShardId(EntityId.make("late"), "default"), {
                  interrupt: true
                })
              } else {
                const close = yield* Scope.close(targetScope, Exit.void).pipe(Effect.fork)
                yield* finalizerEntered.await
                assert.isTrue(closing)
                assert.strictEqual(yield* sharding.isShutdown, trigger === "shutdown")
                assert(
                  Option.isNone(yield* Fiber.poll(close)),
                  "the target finalizer must hold registration teardown open"
                )
                if (trigger === "closed manager") {
                  yield* finishFinalizer.open
                  yield* Fiber.join(close)
                }
                yield* sendNow.open
              }
              yield* TestClock.adjust(1)
              const request = driver.journal.find((e) =>
                e._tag === "Request" && e.address.entityType === target.type && e.address.entityId === "late"
              )
              assert(request?._tag === "Request", "send-time abandonment must persist the target request for replay")
              assert.deepStrictEqual(driver.requests.get(request.requestId)!.replies, [])
              assert.strictEqual(
                targetCalls,
                trigger === "parked waiter" ? 2 : 1,
                "only requests sent before teardown may reach the handler"
              )
              assert.strictEqual(routeFailures, trigger === "closing manager" ? 1 : 0)
              const run = driver.journal.find((e) =>
                e._tag === "Request" && e.tag === "run" && e.address.entityId === executionId
              )
              assert(run?._tag === "Request")
              assert.deepStrictEqual(
                driver.requests.get(run.requestId)!.replies,
                [],
                `send-time abandonment must not persist Complete; requester=${JSON.stringify(observed)}`
              )
              assert.strictEqual(observed.insideMask, masked, "recovery must respect the caller's interruption mask")
              assert.strictEqual(observed.pendingInMask, masked, "masked recovery must retain pending abandonment")
              assert.isFalse(observed.continued)
              assert.strictEqual(durableFinalizers, 0)
              assert.strictEqual(driver.journal.filter((e) => e._tag === "Interrupt").length, 0)
              assert(writer, "the public RPC write fiber must persist the abandoned request")
              const writeExit = yield* Fiber.poll(writer)
              assert(
                Option.isSome(writeExit) && Exit.isFailure(writeExit.value),
                "the write fiber must finish interrupted"
              )
              assert(Cause.isInterruptedOnly(writeExit.value.cause) && Abandon.isCause(writeExit.value.cause))
              assert(
                requesterExit && Exit.isFailure(requesterExit),
                "the requester must finish rather than remain parked"
              )
              assert(Cause.isInterruptedOnly(requesterExit.cause) && Abandon.isCause(requesterExit.cause))
            }).pipe(Effect.ensuring(finishFinalizer.open))
          }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
      }
    }
  }
})

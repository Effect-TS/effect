import {
  ClusterError,
  ClusterSchema,
  ClusterWorkflowEngine,
  Entity,
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
  Option,
  Schema,
  Scope,
  TestClock
} from "effect"
import * as Abandon from "../src/internal/clusterAbandon.js"
import { MemoryLive } from "./fixtures/abandonment.js"

describe("workflow send-time abandonment", () => {
  for (const trigger of ["shutdown", "closing manager", "closed manager"] as const) {
    for (const recovery of ["catchAllCause", "exit"] as const) {
      it.effect(`${recovery} cannot complete a workflow after an entity send during ${trigger}`, () =>
        Effect.gen(function*() {
          const driver = yield* MessageStorage.MemoryDriver
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
          const observed = { marked: false, interruptOnly: false, continued: false, interrupted: false }
          const target = Entity.make("SendAbandonmentTarget", [
            Rpc.make("Ping").annotate(ClusterSchema.Persisted, true)
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
              Ping: () =>
                Effect.sync(() => {
                  targetCalls++
                })
            }
          }))).pipe(Scope.extend(targetScope), Effect.provide(context))
          yield* TestClock.adjust(1000)
          const client = yield* target.client.pipe(Effect.provide(context))
          const warmup = yield* client("warm").Ping().pipe(Effect.fork)
          yield* TestClock.adjust(1000)
          yield* Fiber.join(warmup)
          assert.strictEqual(targetCalls, 1)

          const workflow = Workflow.make({
            name: `SendAbandonment/${trigger}/${recovery}`,
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
              const request = targetClient("late").Ping().pipe(Effect.tapErrorCause((cause) =>
                Effect.sync(() => {
                  observed.marked = Abandon.isCause(cause)
                  observed.interruptOnly = Cause.isInterruptedOnly(cause)
                })
              ))
              if (recovery === "catchAllCause") {
                yield* request.pipe(Effect.catchAllCause(() => Effect.void))
              } else {
                yield* Effect.exit(request)
              }
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
            const close = yield* Scope.close(targetScope, Exit.void).pipe(Effect.fork)
            yield* finalizerEntered.await
            assert.isTrue(closing)
            assert.strictEqual(yield* sharding.isShutdown, trigger === "shutdown")
            assert(Option.isNone(yield* Fiber.poll(close)), "the target finalizer must hold registration teardown open")
            if (trigger === "closed manager") {
              yield* finishFinalizer.open
              yield* Fiber.join(close)
            }
            yield* sendNow.open
            yield* TestClock.adjust(1)
            const request = driver.journal.find((e) =>
              e._tag === "Request" && e.address.entityType === target.type && e.address.entityId === "late"
            )
            assert(request?._tag === "Request", "send-time abandonment must persist the target request for replay")
            assert.deepStrictEqual(driver.requests.get(request.requestId)!.replies, [])
            assert.strictEqual(targetCalls, 1, "the abandoned request must not reach the closing handler")
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
            assert.isFalse(observed.continued)
            assert(
              requesterExit && Exit.isFailure(requesterExit),
              "the requester must finish rather than remain parked"
            )
            assert(Cause.isInterruptedOnly(requesterExit.cause) && Abandon.isCause(requesterExit.cause))
            assert.strictEqual(durableFinalizers, 0)
            assert.strictEqual(driver.journal.filter((e) => e._tag === "Interrupt").length, 0)
          }).pipe(Effect.ensuring(finishFinalizer.open))
        }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
    }
  }
})

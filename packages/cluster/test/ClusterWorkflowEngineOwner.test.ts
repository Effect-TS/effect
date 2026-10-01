import {
  ClusterSchema,
  ClusterWorkflowEngine,
  Entity,
  MessageStorage,
  Runners,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { DurableDeferred, Workflow } from "@effect/workflow"
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
import * as RunnerHealth from "../src/RunnerHealth.js"
import * as RunnerStorage from "../src/RunnerStorage.js"
import { MemoryLive } from "./fixtures/abandonment.js"

const Owner = Context.GenericTag<{ readonly active: boolean }>("@effect/cluster/internal/clusterAbandon/Owner")

describe("abandonment outside the owner window", () => {
  for (const where of ["scope finalizer", "detached fiber", "detached masked fiber"] as const) {
    it.effect(`${where} recovers abandonment and persists durable writes for replay`, () =>
      Effect.gen(function*() {
        const testScope = yield* Effect.scope
        const driver = yield* MessageStorage.MemoryDriver
        const bodyReady = yield* Effect.makeLatch()
        const sendNow = yield* Effect.makeLatch()
        const finalizerEntered = yield* Effect.makeLatch()
        const finishFinalizer = yield* Effect.makeLatch()
        const bodyExited = yield* Effect.makeLatch()
        const probeDone = yield* Effect.makeLatch()
        let attempts = 0
        let requesterExit: Exit.Exit<string, unknown> | undefined
        let detachedExit: Exit.Exit<unknown, unknown> | undefined
        const observed = {
          ownerActive: undefined as boolean | undefined,
          masked: undefined as boolean | undefined,
          unaryCaught: undefined as string | undefined,
          interruptedAfterUnary: undefined as boolean | undefined,
          deferredWrite: undefined as string | undefined,
          secondUnaryCaught: undefined as string | undefined,
          continued: false,
          interruptedAtEnd: undefined as boolean | undefined
        }
        const target = Entity.make("OwnerLifetimeTarget", [
          Rpc.make("Ping").annotate(ClusterSchema.Persisted, true)
        ])
        const engine = ClusterWorkflowEngine.layer.pipe(
          Layer.provideMerge(Sharding.layer),
          Layer.provide(RunnerStorage.layerMemory),
          Layer.provide(RunnerHealth.layerNoop),
          Layer.provide(Runners.layerNoop),
          Layer.provide(ShardingConfig.layer({
            shardsPerGroup: 1,
            preemptiveShutdown: true,
            entityTerminationTimeout: 0,
            entityMessagePollInterval: 100,
            entityReplyPollInterval: 100,
            refreshAssignmentsInterval: 100,
            sendRetryInterval: 10
          }))
        )
        const context = yield* Layer.build(engine)
        const targetScope = yield* Scope.fork(yield* Effect.scope, ExecutionStrategy.sequential)
        yield* Effect.addFinalizer(() => finishFinalizer.open)
        yield* Layer.build(target.toLayer(Effect.gen(function*() {
          yield* Effect.addFinalizer(() =>
            Effect.gen(function*() {
              yield* finalizerEntered.open
              yield* finishFinalizer.await
            })
          )
          return {
            Ping: ({ address }) => address.entityId === "late" ? Effect.never : Effect.void
          }
        }))).pipe(Scope.extend(targetScope), Effect.provide(context))
        yield* TestClock.adjust(1000)

        const Gate = DurableDeferred.make("OwnerLifetimeGate")
        const other = Workflow.make({
          name: "OwnerLifetimeOther",
          payload: { id: Schema.String },
          idempotencyKey: ({ id }) => id
        })
        yield* Layer.build(other.toLayer(() => DurableDeferred.await(Gate))).pipe(Effect.provide(context))
        const otherExecutionId = yield* other.execute({ id: "other" }, { discard: true }).pipe(Effect.provide(context))
        yield* TestClock.adjust(1000)
        assert.strictEqual((yield* other.poll(otherExecutionId).pipe(Effect.provide(context)))?._tag, "Suspended")

        const workflow = Workflow.make({
          name: "OwnerLifetimeAbandoned",
          payload: { id: Schema.String },
          success: Schema.String,
          idempotencyKey: ({ id }) => id
        })
        const probe = (targetClient: (id: string) => { Ping: () => Effect.Effect<void, unknown> }) =>
          Effect.gen(function*() {
            yield* Effect.withFiberRuntime((fiber) =>
              Effect.sync(() => {
                const owner = Context.getOption(fiber.currentContext, Owner)
                observed.ownerActive = Option.isSome(owner) ? owner.value.active : undefined
              })
            )
            observed.masked = yield* Effect.checkInterruptible((isInterruptible) => Effect.succeed(!isInterruptible))
            observed.unaryCaught = yield* targetClient("late2").Ping().pipe(
              Effect.as("succeeded"),
              Effect.catchAllCause((cause) => Effect.succeed(Abandon.isCause(cause) ? "abandon" : Cause.pretty(cause)))
            )
            yield* Effect.withFiberRuntime((fiber) =>
              Effect.sync(() => {
                observed.interruptedAfterUnary = !Cause.isEmpty(fiber.getFiberRef(FiberRef.interruptedCause))
              })
            )
            const token = DurableDeferred.tokenFromExecutionId(Gate, { workflow: other, executionId: otherExecutionId })
            observed.deferredWrite = yield* DurableDeferred.succeed(Gate, { token, value: undefined }).pipe(
              Effect.as("succeeded"),
              Effect.catchAllCause((cause) => Effect.succeed(Abandon.isCause(cause) ? "abandon" : Cause.pretty(cause))),
              Effect.provide(context)
            )
            observed.secondUnaryCaught = yield* targetClient("late3").Ping().pipe(
              Effect.as("succeeded"),
              Effect.catchAllCause((cause) => Effect.succeed(Abandon.isCause(cause) ? "abandon" : Cause.pretty(cause)))
            )
            yield* Effect.yieldNow()
            observed.continued = true
            yield* Effect.withFiberRuntime((fiber) =>
              Effect.sync(() => {
                observed.interruptedAtEnd = !Cause.isEmpty(fiber.getFiberRef(FiberRef.interruptedCause))
              })
            )
          }).pipe(Effect.ensuring(probeDone.open))

        yield* Layer.build(workflow.toLayer(() =>
          Effect.gen(function*() {
            if (++attempts > 1) return yield* Effect.never
            const targetClient = yield* target.client
            if (where === "scope finalizer") {
              yield* Effect.addFinalizer(() => probe(targetClient)).pipe(Workflow.provideScope)
            } else {
              const detached = bodyExited.await.pipe(
                Effect.andThen(probe(targetClient)),
                where === "detached masked fiber" ? Effect.uninterruptible : Effect.interruptible,
                Effect.onExit((exit) =>
                  Effect.sync(() => {
                    detachedExit = exit
                  })
                )
              )
              const fiber = yield* Effect.forkDaemon(detached)
              yield* Scope.addFinalizer(testScope, Fiber.interrupt(fiber))
            }
            yield* bodyReady.open
            yield* sendNow.await
            yield* targetClient("late").Ping().pipe(Effect.orDie)
            return "continued"
          }).pipe(Effect.onExit((exit) =>
            Effect.sync(() => {
              requesterExit = exit
              bodyExited.unsafeOpen()
            })
          ))
        )).pipe(Effect.provide(context))
        const executionId = yield* workflow.execute({ id: "one" }, { discard: true }).pipe(Effect.provide(context))
        yield* TestClock.adjust(1000)
        yield* bodyReady.await
        assert.strictEqual(attempts, 1)

        yield* Effect.gen(function*() {
          const close = yield* Scope.close(targetScope, Exit.void).pipe(Effect.fork)
          yield* sendNow.open
          let entered = false
          for (let i = 0; i < 200 && !entered; i++) {
            yield* TestClock.adjust(10)
            entered = Option.isSome(yield* finalizerEntered.await.pipe(Effect.timeoutOption(0)))
          }
          for (let i = 0; i < 20; i++) yield* TestClock.adjust(1)

          const run = driver.journal.find((e) =>
            e._tag === "Request" && e.tag === "run" && e.address.entityId === executionId
          )
          assert(run?._tag === "Request")
          const runReplies = driver.requests.get(run.requestId)!.replies.map((r) => r._tag)
          const deferredRequests = driver.journal.filter((e) =>
            e._tag === "Request" && e.tag === "deferred" && e.address.entityId === otherExecutionId
          ).length
          const lateRequests = driver.journal.filter((e) =>
            e._tag === "Request" && e.address.entityType === target.type
          ).map((e) =>
            e.address.entityId
          )
          const probeFinished = Option.isSome(yield* probeDone.await.pipe(Effect.timeoutOption(0)))
          assert.isTrue(probeFinished, "the post-owner fiber must finish")
          assert.strictEqual(observed.ownerActive, false, "the owner window must be closed when the probe runs")
          assert.strictEqual(observed.masked, where !== "detached fiber")
          assert.strictEqual(
            observed.unaryCaught,
            "abandon",
            "the abandoned request must surface as an abandonment cause"
          )
          assert.strictEqual(
            observed.interruptedAfterUnary,
            false,
            "recovery outside the owner window must not mark the fiber interrupted"
          )
          assert.strictEqual(
            observed.deferredWrite,
            "succeeded",
            "a durable deferred completion is persisted and succeeds"
          )
          assert.strictEqual(observed.secondUnaryCaught, "abandon")
          assert.isTrue(observed.continued, "the fiber continues after recovery")
          assert.strictEqual(observed.interruptedAtEnd, false)
          if (where !== "scope finalizer") {
            assert(detachedExit && Exit.isSuccess(detachedExit), "a detached fiber exits normally after recovery")
          }
          assert(
            requesterExit && Exit.isFailure(requesterExit) && Cause.isInterruptedOnly(requesterExit.cause),
            "the run body itself ends interrupted"
          )
          assert.deepStrictEqual(runReplies, [], "the abandoned run must not persist Complete or Suspended")
          assert.strictEqual(deferredRequests, 1, "the deferred completion is persisted once for the next owner")
          assert.deepStrictEqual(
            lateRequests,
            ["late", "late2", "late3"],
            "abandoned requests are persisted for replay"
          )
          for (const id of ["late2", "late3"]) {
            const request = driver.journal.find((e) => e._tag === "Request" && e.address.entityId === id)
            assert(request?._tag === "Request")
            assert.deepStrictEqual(driver.requests.get(request.requestId)!.replies, [])
          }
          yield* finishFinalizer.open
          const closeExit = yield* Fiber.await(close)
          assert(Exit.isSuccess(closeExit), "registration teardown must complete without interruption")
        }).pipe(Effect.ensuring(finishFinalizer.open))
      }).pipe(Effect.scoped, Effect.provide(MemoryLive)), 30_000)
  }
})

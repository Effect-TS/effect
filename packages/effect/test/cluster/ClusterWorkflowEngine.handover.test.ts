import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, Schema, Scope } from "effect"
import { TestClock } from "effect/testing"
import {
  ClusterWorkflowEngine,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "effect/unstable/cluster"
import { DurableDeferred, Workflow } from "effect/unstable/workflow"

const Gate = DurableDeferred.make("DeferredHandover/Gate", { success: Schema.String })
const HandoverWorkflow = Workflow.make("DeferredHandover", {
  payload: { id: Schema.String },
  success: Schema.String,
  idempotencyKey: ({ id }) => id
})
const HandoverWorkflowLayer = HandoverWorkflow.toLayer(() => DurableDeferred.await(Gate))

const engine = (storage: MessageStorage.MessageStorage["Service"], delayDeferredReplies: boolean) => {
  const wrapped: MessageStorage.MessageStorage["Service"] = delayDeferredReplies
    ? {
      ...storage,
      // Model SQL/TCP latency: the deferred handler's reply lands after the replay reads.
      saveReply: (reply) =>
        reply.rpc._tag === "deferred"
          ? Effect.andThen(Effect.sleep(100), storage.saveReply(reply))
          : storage.saveReply(reply)
    }
    : storage
  return HandoverWorkflowLayer.pipe(Layer.provideMerge(
    ClusterWorkflowEngine.layer.pipe(
      Layer.provideMerge(Sharding.layer),
      Layer.provide(Runners.layerNoop),
      Layer.provide(RunnerStorage.layerMemory),
      Layer.provide(RunnerHealth.layerNoop),
      Layer.provide(Snowflake.layerGenerator),
      Layer.provide(Layer.succeed(MessageStorage.MessageStorage, wrapped)),
      Layer.provide(ShardingConfig.layer({
        shardsPerGroup: 300,
        availableShardGroups: ["default", "workflow"],
        assignedShardGroups: ["default", "workflow"],
        entityMailboxCapacity: 10,
        entityTerminationTimeout: 0,
        entityMessagePollInterval: 5000,
        sendRetryInterval: 100
      }))
    )
  ))
}

const settle = (sharding: Sharding.Sharding["Service"]) =>
  Effect.gen(function*() {
    yield* Effect.yieldNow
    yield* TestClock.adjust(1)
    yield* sharding.pollStorage
  })

describe("ClusterWorkflowEngine owner handover", () => {
  for (const delayed of [false, true]) {
    it.effect(
      delayed
        ? "retains a completion before the first local run while its reply is being persisted"
        : "completes after handover when the deferred reply is persisted immediately",
      () =>
        Effect.gen(function*() {
          const shared = yield* Layer.build(
            MessageStorage.layerMemory.pipe(Layer.provide(ShardingConfig.layerDefaults))
          )
          const storage = Context.get(shared, MessageStorage.MessageStorage)

          // Owner A: run once, suspend on the deferred, then stop.
          const scopeA = yield* Scope.fork(yield* Scope.Scope)
          const ctxA = yield* Layer.build(engine(storage, delayed)).pipe(Effect.provideService(Scope.Scope, scopeA))
          const shardingA = Context.get(ctxA, Sharding.Sharding)
          const executionId = yield* HandoverWorkflow.executionId({ id: "one" }).pipe(Effect.provide(ctxA))
          yield* HandoverWorkflow.execute({ id: "one" }, { discard: true }).pipe(Effect.provide(ctxA))
          let result = yield* HandoverWorkflow.poll(executionId).pipe(Effect.provide(ctxA))
          for (let i = 0; i < 200 && !(Option.isSome(result) && result.value._tag === "Suspended"); i++) {
            yield* settle(shardingA)
            result = yield* HandoverWorkflow.poll(executionId).pipe(Effect.provide(ctxA))
          }
          assert(
            Option.isSome(result) && result.value._tag === "Suspended",
            "owner A must leave the workflow suspended"
          )
          yield* Scope.close(scopeA, Exit.void)

          // Owner B: fresh engine, same storage; the completion arrives before any local run.
          const scopeB = yield* Scope.fork(yield* Scope.Scope)
          const ctxB = yield* Layer.build(engine(storage, delayed)).pipe(Effect.provideService(Scope.Scope, scopeB))
          const shardingB = Context.get(ctxB, Sharding.Sharding)
          const token = DurableDeferred.tokenFromExecutionId(Gate, { workflow: HandoverWorkflow, executionId })
          yield* DurableDeferred.succeed(Gate, { token, value: "signal" }).pipe(Effect.provide(ctxB))
          result = yield* HandoverWorkflow.poll(executionId).pipe(Effect.provide(ctxB))
          // Stay below the 5-second storage poll interval: a later retry must not hide a lost wake-up.
          for (let i = 0; i < 2000 && !(Option.isSome(result) && result.value._tag === "Complete"); i++) {
            yield* settle(shardingB)
            result = yield* HandoverWorkflow.poll(executionId).pipe(Effect.provide(ctxB))
          }
          // Let any delayed reply save elapse before teardown.
          for (let k = 0; k < 5; k++) yield* settle(shardingB)
          yield* TestClock.adjust(1000)
          yield* Scope.close(scopeB, Exit.void)
          assert(
            Option.isSome(result) && result.value._tag === "Complete" && Exit.isSuccess(result.value.exit) &&
              result.value.exit.value === "signal",
            `workflow must complete after the completion reaches the new owner: ${JSON.stringify(result)}`
          )
        }).pipe(Effect.scoped),
      30_000
    )
  }
})

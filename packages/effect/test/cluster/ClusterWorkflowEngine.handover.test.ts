import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Schema } from "effect"
import { TestClock } from "effect/testing"
import { MessageStorage, ShardingConfig } from "effect/unstable/cluster"
import { DurableDeferred, Workflow } from "effect/unstable/workflow"
import { makeTestWorkflowEngine, pollUntil } from "./TestWorkflowEngine.ts"

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
    makeTestWorkflowEngine({ storageLayer: Layer.succeed(MessageStorage.MessageStorage, wrapped) })
  ))
}

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
          // Each owner is a fresh engine over the shared storage, torn down when its block ends.
          const withOwner = <A, E>(body: Effect.Effect<A, E, Layer.Success<ReturnType<typeof engine>>>) =>
            Effect.scoped(Effect.gen(function*() {
              const context = yield* Layer.build(engine(storage, delayed))
              return yield* Effect.provide(body, context)
            }))

          // Owner A: run once, suspend on the deferred, then stop.
          const executionId = yield* withOwner(Effect.gen(function*() {
            const executionId = yield* HandoverWorkflow.executionId({ id: "one" })
            yield* HandoverWorkflow.execute({ id: "one" }, { discard: true })
            yield* pollUntil(HandoverWorkflow, executionId, "Suspended")
            return executionId
          }))

          // Owner B: the completion arrives before any local run.
          const result = yield* withOwner(Effect.gen(function*() {
            const token = DurableDeferred.tokenFromExecutionId(Gate, { workflow: HandoverWorkflow, executionId })
            yield* DurableDeferred.succeed(Gate, { token, value: "signal" })
            // Stay below the 5-second storage poll interval: a later retry must not hide a lost wake-up.
            const result = yield* pollUntil(HandoverWorkflow, executionId, "Complete", { rounds: 2000 })
            // Let any delayed reply save elapse before teardown.
            yield* TestClock.adjust(1000)
            return result
          }))
          assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.succeed("signal") }))
        }).pipe(Effect.scoped),
      30_000
    )
  }
})

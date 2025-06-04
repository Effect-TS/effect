import {
  ClusterWorkflowEngine,
  MessageStorage,
  Runners,
  Sharding,
  ShardingConfig,
  ShardManager,
  ShardStorage
} from "@effect/cluster"
import { assert, describe, expect, it } from "@effect/vitest"
import { Activity, DurableClock, DurableDeferred, Workflow, WorkflowEngine } from "@effect/workflow"
import { DateTime, Effect, Exit, Fiber, Layer, Schema, TestClock } from "effect"

describe.concurrent("ClusterWorkflowEngine", () => {
  it.effect("should run a workflow", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      yield* TestClock.adjust(1)

      const fiber = yield* EmailWorkflow.execute({
        id: "test-email-1",
        to: "bob@example.com"
      }).pipe(Effect.fork)

      yield* TestClock.adjust(1)
      // let workflow resume after DurableClock
      yield* TestClock.adjust(5000)

      // - 1 initial request
      // - 5 attempts to send email
      // - 1 sleep activity
      // - 1 durable clock run
      // - 1 durable clock deferred set
      expect(driver.requests.size).toEqual(9)
      const executionId = driver.journal[0].address.entityId

      const token = yield* DurableDeferred.token(EmailTrigger).pipe(
        Effect.provideService(WorkflowEngine.WorkflowInstance, {
          workflow: EmailWorkflow,
          executionId,
          suspended: false
        })
      )
      yield* DurableDeferred.done(EmailTrigger, {
        token,
        exit: Exit.void
      })
      yield* TestClock.adjust(5000)

      // - 1 DurableDeferred set
      expect(driver.requests.size).toEqual(10)

      expect(yield* Fiber.join(fiber)).toBeUndefined()

      // test deduplication
      yield* EmailWorkflow.execute({
        id: "test-email-1",
        to: "bob@example.com"
      })
      expect(driver.requests.size).toEqual(10)
    }).pipe(
      Effect.provide(TestWorkflowLayer)
    ))

  it.effect("interrupt", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      yield* TestClock.adjust(1)

      const fiber = yield* EmailWorkflow.execute({
        id: "test-email-2",
        to: "bob@example.com"
      }).pipe(Effect.fork)

      yield* TestClock.adjust(1)
      yield* TestClock.adjust(1)

      const envelope = driver.journal[0]
      const executionId = envelope.address.entityId
      yield* EmailWorkflow.interrupt(executionId)

      // - 1 initial request
      // - 5 attempts to send email
      // - 1 sleep activity
      // - 1 durable clock run
      // - 1 durable clock deferred set
      // - 1 interrupt signal set
      expect(driver.requests.size).toEqual(10)
      yield* TestClock.adjust(5000)
      // - clock cleared
      expect(driver.requests.size).toEqual(9)

      const result = driver.requests.get(envelope.requestId)!
      const reply = result.replies[0]!
      assert(
        reply._tag === "WithExit" &&
          reply.exit._tag === "Success"
      )
      const value = reply.exit.value as Workflow.ResultEncoded<any, any>
      assert(value._tag === "Complete" && value.exit._tag === "Failure")

      const exit = yield* Fiber.await(fiber)
      assert(Exit.isInterrupted(exit))

      const flags = yield* Flags
      assert.isTrue(flags.get("compensation"))
    }).pipe(
      Effect.provide(TestWorkflowLayer)
    ))

  it.effect("Workflow.withCompensation", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)

      const fiber = yield* EmailWorkflow.execute({
        id: "test-email-3",
        to: "compensation"
      }).pipe(Effect.fork)

      yield* TestClock.adjust(1)

      const flags = yield* Flags
      assert.isTrue(flags.get("compensation"))

      const error = yield* Fiber.join(fiber).pipe(
        Effect.flip
      )
      expect(error).toBeInstanceOf(SendEmailError)
    }).pipe(
      Effect.provide(TestWorkflowLayer)
    ))
})

const TestShardingConfig = ShardingConfig.layer({
  shardsPerGroup: 300,
  entityMailboxCapacity: 10,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 5000,
  sendRetryInterval: 100
})

const TestWorkflowEngine = ClusterWorkflowEngine.layer.pipe(
  Layer.provide(Sharding.layer),
  Layer.provide(ShardManager.layerClientLocal),
  Layer.provide(ShardStorage.layerMemory),
  Layer.provide(Runners.layerNoop),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provide(TestShardingConfig)
)

class SendEmailError extends Schema.TaggedError<SendEmailError>("SendEmailError")("SendEmailError", {
  message: Schema.String
}) {}

const EmailWorkflow = Workflow.make({
  name: "EmailWorkflow",
  payload: {
    to: Schema.String,
    id: Schema.String
  },
  error: SendEmailError,
  idempotencyKey(payload) {
    return payload.id
  }
})

class Flags extends Effect.Service<Flags>()("Flags", {
  succeed: new Map<string, boolean>()
}) {}

const EmailWorkflowLayer = EmailWorkflow.toLayer(Effect.fn(function*(payload) {
  const flags = yield* Flags

  yield* Activity.make({
    name: "SendEmail",
    error: SendEmailError,
    execute: Effect.gen(function*() {
      const attempt = yield* Activity.CurrentAttempt

      if (attempt !== 5) {
        return yield* new SendEmailError({
          message: `Failed to send email for ${payload.id} on attempt ${attempt}`
        })
      }
    })
  }).pipe(
    EmailWorkflow.withCompensation(Effect.fnUntraced(function*(_) {
      flags.set("compensation", true)
    })),
    Activity.retry({ times: 5 })
  )

  if (payload.to === "compensation") {
    return yield* new SendEmailError({ message: `Compensation triggered` })
  }

  const result = yield* Activity.make({
    name: "Sleep",
    success: Schema.DateTimeUtc,
    execute: Effect.gen(function*() {
      // suspended inside Activity
      yield* DurableClock.sleep({
        name: "Some sleep",
        duration: "10 seconds"
      })
      return yield* DateTime.now
    })
  })
  // test serialization from Activity
  assert(DateTime.isUtc(result))

  yield* DurableDeferred.token(EmailTrigger)
  // suspended outside Activity
  yield* DurableDeferred.await(EmailTrigger)
})).pipe(
  Layer.provideMerge(Flags.Default)
)

const EmailTrigger = DurableDeferred.make("EmailTrigger")

const TestWorkflowLayer = EmailWorkflowLayer.pipe(
  Layer.provideMerge(TestWorkflowEngine)
)

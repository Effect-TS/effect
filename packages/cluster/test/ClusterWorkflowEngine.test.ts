import {
  ClusterError,
  ClusterSchema,
  ClusterWorkflowEngine,
  Entity,
  EntityId,
  MessageStorage,
  Runners,
  Sharding,
  ShardingConfig,
  Snowflake
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, expect, it } from "@effect/vitest"
import { Activity, DurableClock, DurableDeferred, Workflow } from "@effect/workflow"
import { WorkflowEngine, WorkflowInstance } from "@effect/workflow/WorkflowEngine"
import {
  Context,
  DateTime,
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
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as WorkflowEngineContractTest from "../../workflow/test/WorkflowEngineContractTest.js"
import * as Abandon from "../src/internal/clusterAbandon.js"
import * as RunnerHealth from "../src/RunnerHealth.js"
import * as RunnerStorage from "../src/RunnerStorage.js"
import { abandonmentCause, MemoryLive } from "./fixtures/abandonment.js"
import { makeRequest } from "./fixtures/message-storage.js"
import { runFixture } from "./fixtures/run-fixture.js"
import { makeEngine, makeMemoryEngine } from "./fixtures/workflow-engine.js"

describe.concurrent("ClusterWorkflowEngine", () => {
  it.effect("should run a workflow", () =>
    Effect.gen(function*() {
      const sharding = yield* Sharding.Sharding
      const driver = yield* MessageStorage.MemoryDriver
      const flags = yield* Flags

      const fiber = yield* EmailWorkflow.execute({
        id: "test-email-1",
        to: "bob@example.com"
      }).pipe(Effect.fork)

      yield* TestClock.adjust(1)
      // resume after the clock
      yield* TestClock.adjust("10 seconds")
      yield* sharding.pollStorage
      yield* TestClock.adjust(5000)

      // --- the workflow is suspended at this point

      // - 1 initial request
      // - 5 attempts to send email
      // - 1 sleep activity
      // - 1 durable clock run
      // - 1 durable clock deferred set
      expect(driver.requests.size).toEqual(9)
      const executionId = driver.journal[0].address.entityId

      // normal finalizer should run even after suspension
      expect(flags.get("finalizer")).toBeTruthy()
      // but not compensation
      expect(flags.get("compensation")).toBeFalsy()
      // ensuring will run
      expect(flags.get("ensuring")).toBeTruthy()
      expect(flags.get("catchAllCause")).toBeFalsy()

      // --- resume the workflow using DurableDeferred.done

      const token = yield* DurableDeferred.token(EmailTrigger).pipe(
        Effect.provideService(WorkflowInstance, WorkflowInstance.initial(EmailWorkflow, executionId))
      )
      yield* DurableDeferred.done(EmailTrigger, {
        token,
        exit: Exit.succeed("done")
      })
      yield* sharding.pollStorage

      // - 1 DurableDeferred set
      expect(driver.requests.size).toEqual(10)

      // allow suspend polling to complete
      yield* TestClock.adjust(10000)
      expect(yield* Fiber.join(fiber)).toBeUndefined()

      // --- the workflow is complete

      // ensuring will run
      expect(flags.get("ensuring")).toBeTruthy()
      expect(flags.get("catchAllCause")).toBeFalsy()

      // test deduplication
      yield* EmailWorkflow.execute({
        id: "test-email-1",
        to: "bob@example.com"
      })
      expect(driver.requests.size).toEqual(10)

      // test poll
      expect(yield* EmailWorkflow.poll(executionId)).toEqual(new Workflow.Complete({ exit: Exit.void }))
    }).pipe(Effect.provide(TestWorkflowLayer)))

  it.effect("interrupt", () =>
    Effect.gen(function*() {
      const sharding = yield* Sharding.Sharding
      const driver = yield* MessageStorage.MemoryDriver
      yield* TestClock.adjust(1)

      const fiber = yield* EmailWorkflow.execute({
        id: "test-email-2",
        to: "bob@example.com"
      }).pipe(Effect.fork)

      yield* TestClock.adjust(1)
      yield* TestClock.adjust("10 seconds")
      yield* sharding.pollStorage
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
      yield* sharding.pollStorage
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

  it.effect("Activity.raceAll", () =>
    Effect.gen(function*() {
      const flags = yield* Flags
      yield* TestClock.adjust(1)

      const fiber = yield* RaceWorkflow.execute({
        id: "race-1"
      }).pipe(Effect.fork)

      yield* TestClock.adjust(1)
      yield* TestClock.adjust(1000)

      const result = yield* Fiber.join(fiber)
      expect(result).toEqual("Activity3")

      expect(flags.get("interrupt1")).toBeTruthy()
      expect(flags.get("interrupt2")).toBeTruthy()
      expect(flags.get("interrupt3")).toBeFalsy()
    }).pipe(Effect.provide(TestWorkflowLayer)))

  it.effect("Activity.raceAll durable", () =>
    Effect.gen(function*() {
      const flags = yield* Flags
      const sharding = yield* Sharding.Sharding
      yield* TestClock.adjust(1)

      const fiber = yield* DurableRaceWorkflow.execute({
        id: "race-2"
      }).pipe(Effect.fork)

      yield* TestClock.adjust(1)
      yield* TestClock.adjust(1000)
      yield* sharding.pollStorage
      yield* TestClock.adjust(5000)

      const token = flags.get("durable-race-token")
      assert(typeof token === "string")
      yield* DurableDeferred.done(DurableRaceGate, {
        token: DurableDeferred.Token.make(token),
        exit: Exit.void
      })
      yield* sharding.pollStorage
      yield* TestClock.adjust(5000)

      const result = yield* Fiber.join(fiber)
      expect(result).toEqual("Activity3")
    }).pipe(Effect.provide(TestWorkflowLayer)))

  it.effect("nested workflows", () =>
    Effect.gen(function*() {
      const flags = yield* Flags
      const sharding = yield* Sharding.Sharding
      yield* TestClock.adjust(1)

      yield* ParentWorkflow.execute({
        id: "123"
      }).pipe(Effect.fork)
      yield* TestClock.adjust(1)
      yield* TestClock.adjust(5000)

      assert.isUndefined(flags.get("parent-end"))
      assert.isUndefined(flags.get("child-end"))
      assert.isTrue(flags.get("parent-suspended"))
      const token = flags.get("child-token")
      assert(typeof token === "string")

      yield* DurableDeferred.done(ChildDeferred, {
        token: DurableDeferred.Token.make(token),
        exit: Exit.void
      })
      yield* sharding.pollStorage
      yield* TestClock.adjust(5000)
      assert.isTrue(flags.get("parent-end"))
      assert.isTrue(flags.get("child-end"))
    }).pipe(Effect.provide(TestWorkflowLayer)))

  it.effect("routes durable clock wakeups to the workflow shard group", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      const sharding = yield* Sharding.Sharding

      const fiber = yield* ShardedClockWorkflow.execute({
        id: "sharded-clock"
      }).pipe(Effect.fork)

      yield* TestClock.adjust(1)

      const envelope = driver.journal.find((envelope) =>
        envelope._tag === "Request" && envelope.address.entityType === "Workflow/-/DurableClock"
      )
      assert.exists(envelope)
      assert.strictEqual(envelope.address.shardId.group, "workflow")

      yield* TestClock.adjust("10 seconds")
      yield* sharding.pollStorage
      yield* TestClock.adjust(5000)
      yield* Fiber.join(fiber)
    }).pipe(Effect.provide(TestWorkflowLayer)))

  it.effect("routes durable deferred completions to the workflow shard group after a partial client is cached", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      const engine = yield* WorkflowEngine
      const executionIdBeforeRegister = yield* ShardedDeferredWorkflow.executionId({ id: "before-register" })
      const tokenBeforeRegister = DurableDeferred.tokenFromExecutionId(ShardedDeferred, {
        workflow: ShardedDeferredWorkflow,
        executionId: executionIdBeforeRegister
      })

      const pendingDone = yield* DurableDeferred.done(ShardedDeferred, {
        token: tokenBeforeRegister,
        exit: Exit.void
      }).pipe(Effect.fork)

      yield* engine.register(ShardedDeferredWorkflow, () => Effect.void)
      yield* Fiber.join(pendingDone)

      const executionIdAfterRegister = yield* ShardedDeferredWorkflow.executionId({ id: "after-register" })
      const tokenAfterRegister = DurableDeferred.tokenFromExecutionId(ShardedDeferred, {
        workflow: ShardedDeferredWorkflow,
        executionId: executionIdAfterRegister
      })
      const journalLength = driver.journal.length
      yield* DurableDeferred.done(ShardedDeferred, {
        token: tokenAfterRegister,
        exit: Exit.void
      })

      const envelope = driver.journal.slice(journalLength).find((envelope) =>
        envelope._tag === "Request" && envelope.address.entityType === "Workflow/ShardedDeferredWorkflow"
      )
      assert.exists(envelope)
      assert.strictEqual(envelope.address.shardId.group, "workflow")
    }).pipe(Effect.scoped, Effect.provide(TestWorkflowEngine)))

  it.effect("propagates trace context to persisted workflow requests", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      const engine = yield* WorkflowEngine
      yield* engine.register(ShardedDeferredWorkflow, () => Effect.void)

      const executionId = yield* ShardedDeferredWorkflow.executionId({ id: "trace-context" })
      const token = DurableDeferred.tokenFromExecutionId(ShardedDeferred, {
        workflow: ShardedDeferredWorkflow,
        executionId
      })
      const journalLength = driver.journal.length
      const span = yield* Effect.gen(function*() {
        const span = yield* Effect.currentSpan
        yield* DurableDeferred.done(ShardedDeferred, {
          token,
          exit: Exit.void
        })
        return span
      }).pipe(Effect.withSpan("complete durable deferred"))

      const envelope = driver.journal.slice(journalLength).find((envelope) =>
        envelope._tag === "Request" &&
        envelope.address.entityType === "Workflow/ShardedDeferredWorkflow" &&
        envelope.tag === "deferred"
      )
      assert(envelope?._tag === "Request")
      assert.strictEqual(envelope.traceId, span.traceId)
      assert.strictEqual(envelope.spanId, span.spanId)
      assert.strictEqual(envelope.sampled, span.sampled)
    }).pipe(Effect.scoped, Effect.provide(TestWorkflowEngine)))

  it.effect("routes activities to the workflow shard group after a partial client is cached", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      const engine = yield* WorkflowEngine
      const payload = { id: "partial-client-before-execute" }
      const executionId = yield* ShardedDeferredWorkflow.executionId(payload)
      const token = DurableDeferred.tokenFromExecutionId(ShardedDeferred, {
        workflow: ShardedDeferredWorkflow,
        executionId
      })

      const pendingDone = yield* DurableDeferred.done(ShardedDeferred, {
        token,
        exit: Exit.void
      }).pipe(Effect.fork)
      yield* Effect.yieldNow()

      yield* engine.register(ShardedDeferredWorkflow, () =>
        Activity.make({
          name: "ShardedActivity",
          execute: Effect.void
        }))
      yield* Fiber.join(pendingDone)

      const journalLength = driver.journal.length
      yield* ShardedDeferredWorkflow.execute(payload).pipe(Effect.fork)
      yield* TestClock.adjust(1)
      const envelope = driver.journal.slice(journalLength).find((envelope) =>
        envelope._tag === "Request" &&
        envelope.address.entityType === "Workflow/ShardedDeferredWorkflow" &&
        envelope.tag === "activity"
      )
      assert.exists(envelope)
      assert.strictEqual(envelope.address.shardId.group, "workflow")
    }).pipe(Effect.scoped, Effect.provide(TestWorkflowEngine)))

  it.effect("SuspendOnFailure", () =>
    Effect.gen(function*() {
      const flags = yield* Flags
      yield* TestClock.adjust(1)

      yield* SuspendOnFailureWorkflow.execute({
        id: ""
      }).pipe(Effect.fork)
      yield* TestClock.adjust(1)

      assert.isTrue(flags.get("suspended"))
      assert.include(flags.get("cause"), "boom")
    }).pipe(Effect.provide(TestWorkflowLayer)))

  it.effect("catchAllCause activity", () =>
    Effect.gen(function*() {
      const flags = yield* Flags
      yield* TestClock.adjust(1)

      const fiber = yield* CatchWorkflow.execute({
        id: ""
      }).pipe(Effect.fork)
      yield* TestClock.adjust(1)
      yield* Fiber.join(fiber)

      assert.isTrue(flags.get("catch"))
    }).pipe(Effect.provide(TestWorkflowLayer)))

  it.effect("can serialize workflow defects", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)

      const exit = yield* ErrorDefectWorkflow.execute({
        id: "raw-error-defect"
      }).pipe(Effect.exit)

      assert(Exit.isFailure(exit))
      const [defect] = Cause.defects(exit.cause)
      assert(defect instanceof Error)
      assert.strictEqual(defect.message, "Batch request error: Request timed out")
    }).pipe(Effect.provide(TestWorkflowLayer)))

  it.effect("forwards parent pointer when spawning a child with discard:true", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      const fiber = yield* DiscardParentWorkflow.execute({ id: "discard-parent-1" }).pipe(
        Effect.fork
      )
      yield* TestClock.adjust(1)
      yield* Fiber.join(fiber)

      const findRun = (entityType: string) =>
        driver.journal.find(
          (envelope) =>
            envelope._tag === "Request" &&
            envelope.address.entityType === entityType &&
            envelope.tag === "run"
        )
      const parentRun = findRun("Workflow/DiscardParentWorkflow")
      const childRun = findRun("Workflow/DiscardChildWorkflow")
      assert.exists(parentRun, "expected a run envelope for the parent workflow")
      assert.exists(childRun, "expected a run envelope for the child workflow")

      const childPayload = (childRun as { payload: Record<string, unknown> }).payload
      const parent = childPayload["~@effect/workflow/parent"] as
        | { workflowName: string; executionId: string }
        | undefined
      assert.exists(parent, "child payload should carry the parent pointer")
      expect(parent!.workflowName).toEqual("DiscardParentWorkflow")
      expect(parent!.executionId).toEqual((parentRun as { address: { entityId: string } }).address.entityId)
    }).pipe(Effect.provide(TestWorkflowLayer)))
})

const TestWorkflowEngine = makeMemoryEngine({
  shardsPerGroup: 300,
  availableShardGroups: ["default", "workflow"],
  assignedShardGroups: ["default", "workflow"],
  entityMailboxCapacity: 10,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 5000,
  sendRetryInterval: 100
})

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
  sync: () => new Map<string, boolean | string>()
}) {}

const EmailWorkflowLayer = EmailWorkflow.toLayer(Effect.fn(function*(payload) {
  const flags = yield* Flags

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      flags.set("finalizer", true)
    })
  )

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
    EmailWorkflow.withCompensation(Effect.fnUntraced(function*() {
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
        duration: "10 seconds",
        inMemoryThreshold: Duration.zero
      })
      return yield* DateTime.now
    })
  })
  // test serialization from Activity
  assert(DateTime.isUtc(result))

  yield* DurableDeferred.token(EmailTrigger)
  // suspended outside Activity
  yield* DurableDeferred.await(EmailTrigger).pipe(
    Effect.catchAllCause(() => {
      flags.set("catchAllCause", true)
      return Effect.void
    }),
    Effect.ensuring(Effect.sync(() => {
      flags.set("ensuring", true)
    }))
  )
})).pipe(
  Layer.provideMerge(Flags.Default)
)

const EmailTrigger = DurableDeferred.make("EmailTrigger", {
  success: Schema.String
})

const RaceWorkflow = Workflow.make({
  name: "RaceWorkflow",
  payload: {
    id: Schema.String
  },
  success: Schema.String,
  idempotencyKey: ({ id }) => id
})

const RaceWorkflowLayer = RaceWorkflow.toLayer(Effect.fnUntraced(function*() {
  const flags = yield* Flags

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      flags.set("finalizer", true)
    })
  )

  return yield* Activity.raceAll("race", [
    Activity.make({
      name: "Activity1",
      success: Schema.String,
      error: Schema.Never,
      execute: Effect.onInterrupt(Effect.delay(Effect.succeed("Activity1"), 1000), () =>
        Effect.sync(() => {
          flags.set("interrupt1", true)
        }))
    }),
    Activity.make({
      name: "Activity2",
      success: Schema.String,
      error: Schema.Never,
      execute: Effect.onInterrupt(Effect.delay(Effect.succeed("Activity2"), 500), () =>
        Effect.sync(() => {
          flags.set("interrupt2", true)
        }))
    }),
    Activity.make({
      name: "Activity3",
      success: Schema.String,
      error: Schema.Never,
      execute: Effect.onInterrupt(Effect.delay(Effect.succeed("Activity3"), 100), () =>
        Effect.sync(() => {
          flags.set("interrupt3", true)
        }))
    })
  ])
}))

const DurableRaceWorkflow = Workflow.make({
  name: "DurableRaceWorkflow",
  payload: {
    id: Schema.String
  },
  success: Schema.String,
  idempotencyKey: ({ id }) => id
})

const DurableRaceGate = DurableDeferred.make("DurableRaceGate")

const DurableRaceWorkflowLayer = DurableRaceWorkflow.toLayer(Effect.fnUntraced(function*() {
  const flags = yield* Flags

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      flags.set("finalizer", true)
    })
  )

  const result = yield* Activity.raceAll("race", [
    Activity.make({
      name: "Activity1",
      success: Schema.String,
      error: Schema.Never,
      execute: DurableClock.sleep({
        name: "Activity1",
        duration: 50000,
        inMemoryThreshold: Duration.zero
      }).pipe(
        Effect.as("Activity1")
      )
    }),
    Activity.make({
      name: "Activity2",
      success: Schema.String,
      error: Schema.Never,
      execute: DurableClock.sleep({
        name: "Activity2",
        duration: 10000,
        inMemoryThreshold: Duration.zero
      }).pipe(
        Effect.as("Activity2")
      )
    }),
    Activity.make({
      name: "Activity3",
      success: Schema.String,
      error: Schema.Never,
      execute: DurableClock.sleep({
        name: "Activity3",
        duration: 1000,
        inMemoryThreshold: Duration.zero
      }).pipe(
        Effect.as("Activity3")
      )
    })
  ])
  flags.set("durable-race-token", yield* DurableDeferred.token(DurableRaceGate))
  yield* DurableDeferred.await(DurableRaceGate)
  return result
}))

const ParentWorkflow = Workflow.make({
  name: "ParentWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey(payload) {
    return payload.id
  }
})

const ChildWorkflow = Workflow.make({
  name: "ChildWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey(payload) {
    return payload.id
  }
})

const ParentWorkflowLayer = ParentWorkflow.toLayer(Effect.fnUntraced(function*({ id }) {
  const flags = yield* Flags
  const instance = yield* WorkflowInstance
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      flags.set("parent-suspended", instance.suspended)
    })
  )
  yield* ChildWorkflow.execute({ id })
  flags.set("parent-end", true)
}))

const ChildDeferred = DurableDeferred.make("ChildDeferred")
const ChildWorkflowLayer = ChildWorkflow.toLayer(Effect.fnUntraced(function*() {
  const flags = yield* Flags
  flags.set("child-token", yield* DurableDeferred.token(ChildDeferred))
  yield* DurableDeferred.await(ChildDeferred)
  flags.set("child-end", true)
}))

const ShardedClockWorkflow = Workflow.make({
  name: "ShardedClockWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey(payload) {
    return payload.id
  }
}).annotate(ClusterSchema.ShardGroup, () => "workflow")

const ShardedClockWorkflowLayer = ShardedClockWorkflow.toLayer(Effect.fnUntraced(function*() {
  yield* DurableClock.sleep({
    name: "ShardedClock",
    duration: "10 seconds",
    inMemoryThreshold: Duration.zero
  })
}))

const ShardedDeferred = DurableDeferred.make("ShardedDeferred")

const ShardedDeferredWorkflow = Workflow.make({
  name: "ShardedDeferredWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey(payload) {
    return payload.id
  }
}).annotate(ClusterSchema.ShardGroup, () => "workflow")

const DiscardParentWorkflow = Workflow.make({
  name: "DiscardParentWorkflow",
  payload: { id: Schema.String },
  idempotencyKey(payload) {
    return payload.id
  }
})

const DiscardChildWorkflow = Workflow.make({
  name: "DiscardChildWorkflow",
  payload: { id: Schema.String },
  idempotencyKey(payload) {
    return payload.id
  }
})

const DiscardParentWorkflowLayer = DiscardParentWorkflow.toLayer(
  Effect.fnUntraced(function*({ id }) {
    yield* DiscardChildWorkflow.execute({ id: `${id}-child` }, { discard: true })
  })
)

const DiscardChildWorkflowLayer = DiscardChildWorkflow.toLayer(
  Effect.fnUntraced(function*() {
    return yield* Effect.void
  })
)

const SuspendOnFailureWorkflow = Workflow.make({
  name: "SuspendOnFailureWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey(payload) {
    return payload.id
  }
}).annotate(Workflow.SuspendOnFailure, true)

const SuspendOnFailureWorkflowLayer = SuspendOnFailureWorkflow.toLayer(Effect.fnUntraced(function*() {
  const flags = yield* Flags
  const instance = yield* WorkflowInstance
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      flags.set("suspended", instance.suspended)
      flags.set("cause", Cause.pretty(instance.cause!))
    })
  )
  yield* Activity.make({
    name: "fail",
    execute: Effect.die("boom")
  })
}))

const CatchWorkflow = Workflow.make({
  name: "CatchWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey(payload) {
    return payload.id
  }
})

const CatchWorkflowLayer = CatchWorkflow.toLayer(Effect.fnUntraced(function*() {
  const flags = yield* Flags
  yield* Activity.make({
    name: "fail",
    execute: Effect.die("boom")
  }).pipe(
    Effect.catchAllCause((cause) =>
      Activity.make({
        name: "log",
        execute: Effect.suspend(() => {
          flags.set("catch", true)
          return Effect.log(cause)
        })
      })
    )
  )
}))

const ErrorDefectWorkflow = Workflow.make({
  name: "ErrorDefectWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey(payload) {
    return payload.id
  }
})

const ErrorDefectWorkflowLayer = ErrorDefectWorkflow.toLayer(Effect.fnUntraced(function*() {
  yield* Activity.make({
    name: "raw-error-defect",
    execute: Effect.die(makeBatchRequestError())
  })
}))

const makeBatchRequestError = () => {
  const error = new Error("Batch request error: Request timed out")
  Object.defineProperty(error, "nonJson", {
    enumerable: true,
    value: 1n
  })
  return error
}

const TestWorkflowLayer = EmailWorkflowLayer.pipe(
  Layer.merge(RaceWorkflowLayer),
  Layer.merge(DurableRaceWorkflowLayer),
  Layer.merge(ParentWorkflowLayer),
  Layer.merge(ChildWorkflowLayer),
  Layer.merge(ShardedClockWorkflowLayer),
  Layer.merge(DiscardParentWorkflowLayer),
  Layer.merge(DiscardChildWorkflowLayer),
  Layer.merge(SuspendOnFailureWorkflowLayer),
  Layer.merge(CatchWorkflowLayer),
  Layer.merge(ErrorDefectWorkflowLayer),
  Layer.provideMerge(Flags.Default),
  Layer.provideMerge(TestWorkflowEngine)
)

describe("abandonment", () => {
  const EngineLive = makeEngine({
    shardsPerGroup: 1,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 100,
    entityReplyPollInterval: 100,
    refreshAssignmentsInterval: 100,
    sendRetryInterval: 10
  })

  for (const recovery of ["catchAllCause", "exit"] as const) {
    for (const masked of [false, true]) {
      it.effect(`body ${recovery} cannot durably complete an abandoned attempt (masked=${masked})`, () =>
        Effect.gen(function*() {
          const driver = yield* MessageStorage.MemoryDriver
          const storage = yield* MessageStorage.make(yield* MessageStorage.MessageStorage)
          const request = yield* makeRequest()
          let attempts = 0
          let durableFinalizers = 0
          const workflow = Workflow.make({
            name: `AbandonmentRecovery/${recovery}/${masked}`,
            payload: { id: Schema.String },
            success: Schema.String,
            idempotencyKey: ({ id }) => id
          })
          const layer = workflow.toLayer(() =>
            Effect.gen(function*() {
              // Hold retries so only the abandoned attempt can write a result.
              if (++attempts > 1) return yield* Effect.never
              yield* Workflow.addFinalizer(() => Effect.sync(() => durableFinalizers++))
              const wait = storage.registerReplyHandler(request)
              const recovered = recovery === "catchAllCause"
                ? wait.pipe(Effect.catchAllCause(() => Effect.void))
                : Effect.exit(wait)
              const body = recovered.pipe(Effect.andThen(Effect.yieldNow()), Effect.as("continued"))
              return yield* (masked ? Effect.uninterruptible(body) : body)
            })
          ).pipe(Layer.provideMerge(EngineLive))
          const context = yield* Layer.build(layer)
          const executionId = yield* workflow.execute({ id: "one" }, { discard: true }).pipe(Effect.provide(context))
          yield* TestClock.adjust(1000)
          assert.strictEqual(attempts, 1)
          assert.isUndefined(yield* workflow.poll(executionId).pipe(Effect.provide(context)))

          // Signal the actual waiter; replaying a Cause loses fiber interruption state.
          yield* storage.unregisterShardReplyHandlers(request.envelope.address.shardId, { interrupt: true })
          yield* TestClock.adjust(1000)
          const run = driver.journal.find((e) =>
            e._tag === "Request" && e.tag === "run" && e.address.entityId === executionId
          )
          assert(run?._tag === "Request")
          assert.deepStrictEqual(
            driver.requests.get(run.requestId)!.replies,
            [],
            "catching abandonment must not persist Complete or Suspended"
          )
          assert.isUndefined(yield* workflow.poll(executionId).pipe(Effect.provide(context)))
          assert.strictEqual(durableFinalizers, 0)
          assert.strictEqual(driver.journal.filter((e) => e._tag === "Interrupt").length, 0)
        }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
    }
  }

  for (const suspendOnFailure of [false, true]) {
    it.effect(`replays under a new owner without compensation (SuspendOnFailure=${suspendOnFailure})`, () =>
      Effect.gen(function*() {
        const cause = yield* abandonmentCause
        const driver = yield* MessageStorage.MemoryDriver
        const events: Array<string> = []
        let attempts = 0
        let ownerBStarted = false
        let activityRuns = 0
        const workflow = Workflow.make({
          name: `AbandonmentReplay/${suspendOnFailure}`,
          payload: { id: Schema.String },
          success: Schema.String,
          idempotencyKey: ({ id }) => id
        }).annotate(Workflow.SuspendOnFailure, suspendOnFailure)
        const layer = workflow.toLayer(() =>
          Effect.gen(function*() {
            attempts++
            if (attempts > 1 && !ownerBStarted) return yield* Effect.never
            yield* Effect.succeed("undo").pipe(
              workflow.withCompensation(() => Effect.sync(() => events.push("compensate")))
            )
            yield* Workflow.addFinalizer(() => Effect.sync(() => events.push("durable-finalizer")))
            yield* Effect.acquireRelease(
              Effect.sync(() => events.push("acquire")),
              () => Effect.sync(() => events.push("release"))
            ).pipe(Workflow.provideScope)
            const value = yield* Activity.make({
              name: "BeforeHandoff",
              success: Schema.String,
              execute: Effect.sync(() => {
                activityRuns++
                return "done"
              })
            })
            if (attempts === 1) return yield* Effect.failCause(cause)
            return value
          })
        ).pipe(Layer.provideMerge(EngineLive))

        const ownerA = yield* Scope.fork(yield* Effect.scope, ExecutionStrategy.sequential)
        const contextA = yield* Layer.build(layer).pipe(Scope.extend(ownerA))
        const executionId = yield* workflow.execute({ id: "one" }, { discard: true }).pipe(Effect.provide(contextA))
        yield* TestClock.adjust(1000)
        const run = driver.journal.find((e) =>
          e._tag === "Request" && e.tag === "run" && e.address.entityId === executionId
        )
        assert(run?._tag === "Request")
        assert.strictEqual(
          driver.requests.get(run.requestId)!.replies.length,
          0,
          "abandonment must not persist Complete or Suspended"
        )
        assert.deepStrictEqual(events, ["acquire", "release"])
        assert.strictEqual(activityRuns, 1)
        assert.strictEqual(driver.journal.filter((e) => e._tag === "Interrupt").length, 0)
        yield* Scope.close(ownerA, Exit.void)
        ownerBStarted = true

        const ownerB = yield* Scope.fork(yield* Effect.scope, ExecutionStrategy.sequential)
        const contextB = yield* Layer.build(layer).pipe(Scope.extend(ownerB))
        yield* TestClock.adjust(1000)
        const result = yield* workflow.poll(executionId).pipe(Effect.provide(contextB))
        assert(result?._tag === "Complete")
        assert.deepStrictEqual(result.exit, Exit.succeed("done"))
        assert.isAtLeast(attempts, 2)
        assert.strictEqual(activityRuns, 1, "completed activity must not execute again on replay")
        assert.deepStrictEqual(events, ["acquire", "release", "acquire", "release", "durable-finalizer"])
      }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
  }

  it.effect("a recorded durable interrupt wins over abandonment and runs compensation", () =>
    Effect.gen(function*() {
      const result = yield* runFixture(new URL("./fixtures/workflow-interrupt-abandonment.ts", import.meta.url))
      assert.isFalse(result.timedOut, `workflow runtime stalled after releasing abandonment: ${result.output}`)
      assert.strictEqual(result.code, 0, result.output)
    }), 30_000)

  it.effect("an abandoned child does not enqueue a parent resume", () =>
    Effect.gen(function*() {
      const cause = yield* abandonmentCause
      const driver = yield* MessageStorage.MemoryDriver
      const child = Workflow.make({
        name: "AbandonedChild",
        payload: { id: Schema.String },
        idempotencyKey: ({ id }) => id
      })
      const parent = Workflow.make({
        name: "AbandonedParent",
        payload: { id: Schema.String },
        idempotencyKey: ({ id }) => id
      })
      let attempted = false
      const layers = Layer.merge(
        child.toLayer(() =>
          Effect.suspend(() => {
            if (attempted) return Effect.never
            attempted = true
            return Effect.failCause(cause)
          })
        ),
        parent.toLayer(({ id }) => child.execute({ id }, { discard: true }).pipe(Effect.andThen(Effect.never)))
      ).pipe(Layer.provideMerge(EngineLive))
      const context = yield* Layer.build(layers)
      yield* parent.execute({ id: "one" }, { discard: true }).pipe(Effect.provide(context))
      yield* TestClock.adjust(1000)
      const request = driver.journal.find((e) =>
        e._tag === "Request" && e.address.entityType === "Workflow/AbandonedChild" && e.tag === "run"
      )
      assert(request?._tag === "Request")
      assert.isDefined((request.payload as any)["~@effect/workflow/parent"])
      assert.strictEqual(driver.journal.filter((e) => e._tag === "Request" && e.tag === "resume").length, 0)
      assert.strictEqual(driver.requests.get(request.requestId)!.replies.length, 0)
      assert.isFalse(yield* Context.get(context, Sharding.Sharding).isShutdown)
    }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
})

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
                  // Inject a routing error and let the real send path propagate abandonment.
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
                if (trigger !== "parked waiter" || path !== "mailbox") yield* Effect.yieldNow()
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
              const run = driver.journal.find((e) =>
                e._tag === "Request" && e.tag === "run" && e.address.entityId === executionId
              )
              assert(run?._tag === "Request")
              assert.deepStrictEqual(
                driver.requests.get(run.requestId)!.replies,
                [],
                `send-time abandonment must not persist Complete; requester=${JSON.stringify(observed)}`
              )
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

WorkflowEngineContractTest.suite({
  name: "cluster",
  engineLayer: makeMemoryEngine({
    shardsPerGroup: 10,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 5000,
    entityReplyPollInterval: 10,
    sendRetryInterval: 10
  }),
  tick: Effect.flatMap(
    Effect.serviceOption(Sharding.Sharding),
    (sharding) => Option.isSome(sharding) ? sharding.value.pollStorage : Effect.yieldNow()
  )
})

describe("deferred completion persistence", () => {
  const config = {
    shardsPerGroup: 300,
    availableShardGroups: ["default", "workflow"],
    assignedShardGroups: ["default", "workflow"],
    entityMailboxCapacity: 10,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 5000,
    sendRetryInterval: 100
  } as const

  type Driver = MessageStorage.MemoryDriver
  type Encoded = MessageStorage.Encoded
  const requestTag = (driver: Driver, requestId: string) => driver.requests.get(requestId)?.envelope.tag
  const isSuspended = (reply: Parameters<Encoded["saveReply"]>[0]) =>
    reply._tag === "WithExit" && reply.exit._tag === "Success" && reply.exit.value?._tag === "Suspended"

  const sharedDriver = Effect.map(
    Layer.build(MessageStorage.layerMemory.pipe(Layer.provide(ShardingConfig.layerDefaults))),
    (ctx) => Context.get(ctx, MessageStorage.MemoryDriver)
  )
  const gated = (driver: Driver, hooks: Partial<Encoded>) =>
    MessageStorage.makeEncoded({ ...driver.encoded, ...hooks }).pipe(Effect.provide(Snowflake.layerGenerator))

  const advanceUntil = (sharding: Sharding.Sharding["Type"], predicate: () => boolean, label: string, limit = 2000) =>
    Effect.gen(function*() {
      for (let i = 0; i < limit && !predicate(); i++) {
        yield* Effect.yieldNow()
        yield* TestClock.adjust(1)
        yield* sharding.pollStorage
      }
      assert.isTrue(predicate(), label)
    })

  const pollUntil = (
    sharding: Sharding.Sharding["Type"],
    workflow: {
      readonly poll: (id: string) => Effect.Effect<Workflow.Result<unknown, unknown> | undefined, never, WorkflowEngine>
    },
    executionId: string,
    tag: string,
    limit = 2000
  ) =>
    Effect.gen(function*() {
      let result = yield* workflow.poll(executionId)
      for (let i = 0; i < limit && result?._tag !== tag; i++) {
        yield* Effect.yieldNow()
        yield* TestClock.adjust(1)
        yield* sharding.pollStorage
        result = yield* workflow.poll(executionId)
      }
      return result
    })

  it.effect(
    "resumes a discarded execution when completion precedes the suspension commit",
    () =>
      Effect.gen(function*() {
        const releaseRun = yield* Effect.makeLatch()
        let savingRun = false
        let readBeforeCommit = false
        let savedDeferred = false
        let released = false
        let runRequestId: string | undefined
        const gate = DurableDeferred.make("DiscardedSuspension/Gate", { success: Schema.String })
        const workflow = Workflow.make({
          name: "DiscardedSuspension",
          payload: {},
          success: Schema.String,
          idempotencyKey: () => "one"
        })
        const driver = yield* sharedDriver
        const storage = yield* gated(driver, {
          saveReply: (reply) => {
            if (isSuspended(reply) && !savingRun) {
              runRequestId = reply.requestId
              savingRun = true
              return releaseRun.await.pipe(Effect.andThen(driver.encoded.saveReply(reply)))
            }
            return driver.encoded.saveReply(reply).pipe(
              Effect.tap(() =>
                Effect.sync(() => {
                  if (requestTag(driver, reply.requestId) === "deferred") savedDeferred = true
                })
              )
            )
          },
          repliesForUnfiltered: (requestIds) =>
            driver.encoded.repliesForUnfiltered(requestIds).pipe(
              Effect.tap((replies) =>
                Effect.sync(() => {
                  if (!released && runRequestId !== undefined && requestIds.includes(runRequestId)) {
                    assert.deepStrictEqual(replies, [])
                    readBeforeCommit = true
                  }
                })
              )
            )
        })
        const context = yield* Layer.build(
          workflow.toLayer(() => DurableDeferred.await(gate)).pipe(
            Layer.provideMerge(makeEngine(config)),
            Layer.provide(Layer.succeed(MessageStorage.MessageStorage, storage))
          )
        )
        const sharding = Context.get(context, Sharding.Sharding)
        yield* Effect.addFinalizer(() => releaseRun.open)
        yield* Effect.gen(function*() {
          // No execute waiter may retry a Suspended reply and repair the lost wake-up.
          const executionId = yield* workflow.execute(undefined, { discard: true })
          yield* advanceUntil(sharding, () => savingRun, "run must reach suspension persistence")
          yield* DurableDeferred.succeed(gate, {
            token: DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId }),
            value: "signal"
          })
          // Hold the commit until the completion's resume read observes no reply.
          yield* advanceUntil(sharding, () => readBeforeCommit, "completion must read the uncommitted run")
          released = true
          yield* releaseRun.open
          yield* advanceUntil(sharding, () => savedDeferred, "deferred completion must be persisted")
          const result = yield* pollUntil(sharding, workflow, executionId, "Complete")
          assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.succeed("signal") }))
        }).pipe(Effect.provide(context))
      }).pipe(Effect.scoped),
    20_000
  )

  for (const entityMailboxCapacity of [2, 3]) {
    it.effect(
      `admits a required completion after an unrelated completion with mailbox capacity ${entityMailboxCapacity}`,
      () =>
        Effect.gen(function*() {
          const required = DurableDeferred.make("MailboxProgress/Required", { success: Schema.String })
          const unrelated = DurableDeferred.make("MailboxProgress/Unrelated", { success: Schema.String })
          const workflow = Workflow.make({
            name: "MailboxProgress",
            payload: {},
            success: Schema.String,
            idempotencyKey: () => "one"
          })
          let instance: WorkflowInstance["Type"] | undefined
          let runRequestId: string | undefined
          let unrelatedRead = false
          const driver = yield* sharedDriver
          const storage = yield* gated(driver, {
            repliesForUnfiltered: (requestIds) =>
              driver.encoded.repliesForUnfiltered(requestIds).pipe(
                Effect.tap(() =>
                  Effect.sync(() => {
                    if (runRequestId !== undefined && requestIds.includes(runRequestId)) unrelatedRead = true
                  })
                )
              )
          })
          const context = yield* Layer.build(
            workflow.toLayer(() =>
              Effect.gen(function*() {
                instance = yield* WorkflowInstance
                return yield* DurableDeferred.raceAll({
                  name: "mailbox-progress",
                  success: Schema.String,
                  error: Schema.Never,
                  effects: [DurableDeferred.await(required), Effect.never]
                })
              })
            ).pipe(
              Layer.provideMerge(makeEngine({ ...config, entityMailboxCapacity })),
              Layer.provide(Layer.succeed(MessageStorage.MessageStorage, storage))
            )
          )
          const sharding = Context.get(context, Sharding.Sharding)
          yield* Effect.gen(function*() {
            const executionId = yield* workflow.execute(undefined, { discard: true })
            yield* advanceUntil(sharding, () =>
              instance?.awaitedDeferreds.has(required.name) === true, "run must await the required deferred")
            assert.isFalse(instance!.awaitedDeferreds.has(unrelated.name))
            const run = driver.journal.find((message) =>
              message._tag === "Request" && message.tag === "run"
            )!
            runRequestId = run.requestId
            yield* DurableDeferred.succeed(unrelated, {
              token: DurableDeferred.tokenFromExecutionId(unrelated, { workflow, executionId }),
              value: "unrelated"
            })
            yield* advanceUntil(sharding, () => unrelatedRead, "unrelated completion must inspect the active run", 500)
            yield* DurableDeferred.succeed(required, {
              token: DurableDeferred.tokenFromExecutionId(required, { workflow, executionId }),
              value: "signal"
            })
            const result = yield* pollUntil(sharding, workflow, executionId, "Complete", 300)
            const pendingDeferreds = Array.from(driver.requests.values()).filter((entry) =>
              entry.envelope._tag === "Request" && entry.envelope.tag === "deferred" && entry.replies.length === 0
            ).map((entry) => (entry.envelope as any).payload.name)
            assert.deepStrictEqual(
              result,
              new Workflow.Complete({ exit: Exit.succeed("signal") }),
              `required completion must progress; pending deferreds: ${pendingDeferreds.join(", ")}`
            )
          }).pipe(Effect.provide(context))
        }).pipe(Effect.scoped),
      20_000
    )
  }

  it.effect("retains a handover completion before its deferred reply is persisted", () =>
    Effect.gen(function*() {
      const gate = DurableDeferred.make("DeferredHandover/Gate", { success: Schema.String })
      const workflow = Workflow.make({
        name: "DeferredHandover",
        payload: {},
        success: Schema.String,
        idempotencyKey: () => "one"
      })
      const driver = yield* sharedDriver
      let delayed = 0
      const storage = yield* gated(driver, {
        saveReply: (reply) =>
          requestTag(driver, reply.requestId) === "deferred"
            ? Effect.sync(() => delayed++).pipe(
              Effect.andThen(Effect.sleep(100)),
              Effect.andThen(driver.encoded.saveReply(reply))
            )
            : driver.encoded.saveReply(reply)
      })
      const layer = workflow.toLayer(() => DurableDeferred.await(gate)).pipe(
        Layer.provideMerge(makeEngine(config)),
        Layer.provide(Layer.succeed(MessageStorage.MessageStorage, storage))
      )
      // Each owner has a fresh engine over the same durable storage.
      const withOwner = <A, E>(body: (sharding: Sharding.Sharding["Type"]) => Effect.Effect<A, E, WorkflowEngine>) =>
        Effect.scoped(Effect.gen(function*() {
          const context = yield* Layer.build(layer)
          const sharding = Context.get(context, Sharding.Sharding)
          const result = yield* Effect.provide(body(sharding), context)
          yield* TestClock.adjust(1000)
          return result
        }))
      const executionId = yield* withOwner((sharding) =>
        Effect.gen(function*() {
          const id = yield* workflow.execute(undefined, { discard: true })
          assert.deepStrictEqual(yield* pollUntil(sharding, workflow, id, "Suspended"), new Workflow.Suspended())
          return id
        })
      )
      const result = yield* withOwner((sharding) =>
        Effect.gen(function*() {
          yield* DurableDeferred.succeed(gate, {
            token: DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId }),
            value: "signal"
          })
          return yield* pollUntil(sharding, workflow, executionId, "Complete", 500)
        })
      )
      assert.isAbove(delayed, 0, "the deferred reply delay must have been exercised")
      assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.succeed("signal") }))
    }).pipe(Effect.scoped), 30_000)
})

/**
 * Durable task state for `McpTasks.layerWorkflow`.
 *
 * The Workflow engine stores write-once deferreds and has no mutable records,
 * so task state is an append-only log of full snapshots (status message and
 * outstanding inputs), and readers take the newest one. Writing a deferred
 * wakes the execution, so a replay must not append again: every change has a
 * durable key, written after its snapshot, and a change whose key exists is
 * skipped. Keys name the change rather than its position, so replays that skip
 * work, such as a cached `DurableDeferred.raceAll`, stay consistent. Answers
 * are separate deferreds, one per input key, written by `tasks/update`.
 */
import * as DateTime from "../../DateTime.ts"
import * as Effect from "../../Effect.ts"
import * as Hash from "../../Hash.ts"
import * as Option from "../../Option.ts"
import * as Schedule from "../../Schedule.ts"
import * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import * as Semaphore from "../../Semaphore.ts"
import * as DurableDeferred from "../../workflow/DurableDeferred.ts"
import type * as Workflow from "../../workflow/Workflow.ts"
import * as WorkflowEngine from "../../workflow/WorkflowEngine.ts"
import type * as McpSchema from "../McpSchema.ts"
import type * as McpTasks from "../McpTasks.ts"

const InputRequest = Schema.Union([
  Schema.Struct({ method: Schema.Literal("roots/list"), params: Schema.optionalKey(Schema.JsonObject) }),
  Schema.Struct({ method: Schema.Literal("elicitation/create"), params: Schema.JsonObject }),
  Schema.Struct({ method: Schema.Literal("sampling/createMessage"), params: Schema.JsonObject })
])
const decodeInputRequest = Schema.decodeUnknownEffect(InputRequest)
const decodeResponse = Schema.decodeUnknownEffect(Schema.JsonObject)

const Snapshot = Schema.Struct({
  statusMessage: Schema.optionalKey(Schema.String),
  inputRequests: Schema.Record(Schema.String, InputRequest),
  at: Schema.DateTimeUtc
})
const snapshot = (index: number) => DurableDeferred.make(`mcp/task/state/${index}`, { success: Snapshot })
const change = (key: string) => DurableDeferred.make(`mcp/task/change/${key}`)
const answer = (key: string) =>
  DurableDeferred.make(`mcp/task/input/${JSON.stringify(key)}`, { success: Schema.JsonObject })

/** @internal */
export const identity = DurableDeferred.make("mcp/task/identity", {
  success: Schema.Struct({ ownerId: Schema.String, createdAt: Schema.DateTimeUtc })
})

/** @internal */
export const make = <
  Name extends string,
  Payload extends Workflow.AnyStructSchema,
  Success extends Schema.Top,
  Error extends Schema.Top
>(
  engine: WorkflowEngine.WorkflowEngine["Service"],
  workflow: Workflow.Workflow<Name, Payload, Success, Error>,
  scope: Scope.Closeable
) => {
  const read = <S extends Schema.Constraint>(executionId: string, deferred: DurableDeferred.DurableDeferred<S>) =>
    engine.deferredResult(deferred).pipe(
      Effect.provideService(
        WorkflowEngine.WorkflowInstance,
        WorkflowEngine.WorkflowInstance.initial(workflow, executionId, { scope })
      ),
      Effect.flatMap(Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (exit) => Effect.map(exit, Option.some)
      })),
      Effect.orDie
    )

  // Engines may persist asynchronously, so wait until the write is readable.
  const write = <S extends Schema.Constraint>(
    executionId: string,
    deferred: DurableDeferred.DurableDeferred<S>,
    value: S["Type"]
  ) =>
    DurableDeferred.succeed(deferred, {
      token: DurableDeferred.tokenFromExecutionId(deferred, { workflow, executionId }),
      value
    }).pipe(
      Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
      Effect.andThen(awaitValue(executionId, deferred))
    )

  const awaitValue = <S extends Schema.Constraint>(executionId: string, deferred: DurableDeferred.DurableDeferred<S>) =>
    read(executionId, deferred).pipe(
      Effect.repeat({ while: Option.isNone, schedule: Schedule.spaced("10 millis") }),
      Effect.map(Option.getOrThrow)
    )

  // Snapshots form a dense prefix, so a galloping search finds the newest.
  const latest = Effect.fnUntraced(function*(executionId: string) {
    const exists = (index: number) => Effect.map(read(executionId, snapshot(index)), Option.isSome)
    let low = 0
    let high = 1
    while (yield* exists(high - 1)) {
      low = high
      high *= 2
    }
    let count = low
    let missing = high - 1
    while (count < missing) {
      const middle = (count + missing) >> 1
      if (yield* exists(middle)) count = middle + 1
      else missing = middle
    }
    return { count, current: count === 0 ? Option.none() : yield* read(executionId, snapshot(count - 1)) }
  })

  /**
   * The newest snapshot, without inputs that already have an answer.
   */
  const state = Effect.fnUntraced(function*(executionId: string) {
    const { current } = yield* latest(executionId)
    if (Option.isNone(current)) return { inputRequests: {} }
    const inputRequests: Record<string, McpSchema.McpInputRequest> = {}
    for (const [key, request] of Object.entries(current.value.inputRequests)) {
      if (Option.isNone(yield* read(executionId, answer(key)))) inputRequests[key] = request
    }
    return { statusMessage: current.value.statusMessage, inputRequests, lastUpdatedAt: current.value.at }
  })

  /**
   * Records answers to outstanding inputs. The first answer for a key wins.
   */
  const update = Effect.fnUntraced(function*(
    executionId: string,
    responses: Readonly<Record<string, McpSchema.McpInputResponse>>
  ) {
    const { inputRequests } = yield* state(executionId)
    for (const [key, response] of Object.entries(responses)) {
      if (!Object.hasOwn(inputRequests, key)) continue
      yield* write(executionId, answer(key), yield* Effect.orDie(decodeResponse(response)))
    }
  })

  /**
   * Builds the `TaskContext` for one run of an execution.
   */
  const context = Effect.gen(function*() {
    const instance = yield* WorkflowEngine.WorkflowInstance
    const executionId = instance.executionId
    const lock = Semaphore.makeUnsafe(1)
    const inputs = new Map<string, typeof InputRequest.Type>()
    const inputKeys = new Set<string>()
    const statusCounts = new Map<string | undefined, number>()
    let statusMessage: string | undefined
    let count: number | undefined

    const append = (key: string) =>
      lock.withPermits(1)(Effect.gen(function*() {
        if (Option.isSome(yield* read(executionId, change(key)))) return
        count ??= (yield* latest(executionId)).count
        yield* write(executionId, snapshot(count), {
          ...(statusMessage === undefined ? {} : { statusMessage }),
          inputRequests: Object.fromEntries(inputs),
          at: yield* DateTime.now
        })
        count++
        yield* write(executionId, change(key), undefined)
      }))

    const taskContext: McpTasks.TaskContext["Service"] = {
      requestInput: Effect.fnUntraced(function*<A, R>(options: {
        readonly key: string
        readonly request: McpSchema.McpInputRequest
        readonly response: Schema.Decoder<A, R>
      }) {
        if (inputKeys.has(options.key)) return yield* Effect.die(new Error("Task input keys must be unique"))
        inputKeys.add(options.key)
        const key = JSON.stringify(options.key)
        // An input answered in an earlier run is never outstanding again.
        if (Option.isNone(yield* read(executionId, answer(options.key)))) {
          inputs.set(options.key, yield* Effect.orDie(decodeInputRequest(options.request)))
          yield* append(`input/${key}`)
        }
        // Durable races run their branches with their own instance of this execution.
        const caller = Option.filter(
          yield* Effect.serviceOption(WorkflowEngine.WorkflowInstance),
          (caller) => caller.executionId === executionId
        )
        const current = Option.getOrElse(caller, () => instance)
        const response = yield* DurableDeferred.await(answer(options.key)).pipe(
          Effect.onInterrupt(() => {
            // Suspension and cancellation keep the input; a lost race withdraws it.
            if (current.suspended || instance.suspended || instance.interrupted) return Effect.void
            inputs.delete(options.key)
            return append(`withdrawn/${key}`)
          }),
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.provideService(WorkflowEngine.WorkflowInstance, current)
        )
        inputs.delete(options.key)
        return yield* Schema.decodeUnknownEffect(options.response)(response)
      }),
      setStatusMessage: (message) =>
        Effect.suspend(() => {
          const occurrence = (statusCounts.get(message) ?? 0) + 1
          statusCounts.set(message, occurrence)
          statusMessage = message
          return append(`status/${occurrence}/${Hash.string(JSON.stringify(message ?? null))}`)
        })
    }

    // The final snapshot records when the task finished and clears its inputs.
    const finish = Effect.suspend(() => {
      inputs.clear()
      return append("finished")
    })

    return { taskContext, finish }
  })

  return { context, state, update, read, write }
}

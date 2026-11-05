/**
 * Durable task state for `McpTasks.layerWorkflow`.
 *
 * The Workflow engine stores write-once deferreds and has no mutable records,
 * so task state is an append-only log of changes that readers fold: input
 * requests, their withdrawals, status messages and completion. Answers are
 * separate deferreds, one per input key, written by `tasks/update`.
 *
 * Writing a deferred wakes the execution, so a replay must not append changes
 * it already recorded, even when it skips work such as a cached
 * `DurableDeferred.raceAll`. Input changes are identified by their unique key,
 * and a suspending run withdraws recorded inputs it no longer waits for.
 * Status messages have no identity, so a run matches each one against the
 * recorded status changes after the last one it matched, and appends only
 * messages it cannot match. Status set concurrently from several fibers may
 * therefore be recorded again in a different order.
 */
import * as DateTime from "../../DateTime.ts"
import * as Effect from "../../Effect.ts"
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

const Change = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("input"), key: Schema.String, request: InputRequest, at: Schema.DateTimeUtc }),
  Schema.Struct({ kind: Schema.Literal("withdrawn"), key: Schema.String, at: Schema.DateTimeUtc }),
  Schema.Struct({ kind: Schema.Literal("status"), message: Schema.optionalKey(Schema.String), at: Schema.DateTimeUtc }),
  Schema.Struct({ kind: Schema.Literal("finished"), at: Schema.DateTimeUtc })
])
type Change = typeof Change.Type
type ChangeInput = Change extends infer C ? C extends Change ? Omit<C, "at"> : never : never
const change = (index: number) => DurableDeferred.make(`mcp/task/change/${index}`, { success: Change })
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

  const readLog = Effect.fnUntraced(function*(executionId: string) {
    const log: Array<Change> = []
    for (;;) {
      const next = yield* read(executionId, change(log.length))
      if (Option.isNone(next)) return log
      log.push(next.value)
    }
  })

  /**
   * Folds the log into the current status and the inputs that have no answer yet.
   */
  const state = Effect.fnUntraced(function*(executionId: string) {
    // Input keys are application strings, including `__proto__`.
    const pending = new Map<string, McpSchema.McpInputRequest>()
    let statusMessage: string | undefined
    let lastUpdatedAt: DateTime.Utc | undefined
    for (const entry of yield* readLog(executionId)) {
      lastUpdatedAt = entry.at
      if (entry.kind === "input") pending.set(entry.key, entry.request)
      else if (entry.kind === "withdrawn") pending.delete(entry.key)
      else if (entry.kind === "status") statusMessage = entry.message
      else pending.clear()
    }
    const inputRequests: Record<string, McpSchema.McpInputRequest> = Object.create(null)
    for (const [key, request] of pending) {
      if (Option.isNone(yield* read(executionId, answer(key)))) inputRequests[key] = request
    }
    return { statusMessage, inputRequests, lastUpdatedAt }
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
    const inputKeys = new Set<string>()
    // The recorded log, loaded on first use; only this run appends to it.
    let log: Array<Change> | undefined
    // Position after the last recorded status change this run has matched or written.
    let statusCursor = 0

    const append = Effect.fnUntraced(function*(entry: ChangeInput) {
      const current = log ??= yield* readLog(executionId)
      const recorded = yield* write(
        executionId,
        change(current.length),
        { ...entry, at: yield* DateTime.now } as Change
      )
      current.push(recorded)
      return current.length - 1
    })

    // Inputs this run is waiting for. Suspension keeps them; completion and withdrawal remove them.
    const awaiting = new Set<string>()

    // The latest recorded change for an input key, if any.
    const lastInputChange = (current: ReadonlyArray<Change>, key: string) => {
      for (let index = current.length - 1; index >= 0; index--) {
        const recorded = current[index]
        if ((recorded.kind === "input" || recorded.kind === "withdrawn") && recorded.key === key) return recorded.kind
      }
      return undefined
    }

    const recordInput = (entry: ChangeInput & { readonly key: string }) =>
      lock.withPermits(1)(Effect.gen(function*() {
        const current = log ??= yield* readLog(executionId)
        const last = lastInputChange(current, entry.key)
        if (entry.kind === "input" ? last === "input" : last !== "input") return
        yield* append(entry)
      }))

    // When the run suspends it is waiting for exactly the inputs in `awaiting`. Withdraw
    // recorded inputs it no longer waits for, such as the losing branch of a race that
    // replay resolved without starting that branch.
    const reconcile = lock.withPermits(1)(Effect.gen(function*() {
      const current = log ??= yield* readLog(executionId)
      const recorded = new Set<string>()
      for (const entry of current) {
        if (entry.kind === "input" || entry.kind === "withdrawn") recorded.add(entry.key)
      }
      for (const key of recorded) {
        if (awaiting.has(key) || lastInputChange(current, key) !== "input") continue
        if (Option.isSome(yield* read(executionId, answer(key)))) continue
        yield* append({ kind: "withdrawn", key })
      }
    }))

    const taskContext: McpTasks.TaskContext["Service"] = {
      requestInput: Effect.fnUntraced(function*<A, R>(options: {
        readonly key: string
        readonly request: McpSchema.McpInputRequest
        readonly response: Schema.Decoder<A, R>
      }) {
        if (inputKeys.has(options.key)) return yield* Effect.die(new Error("Task input keys must be unique"))
        inputKeys.add(options.key)
        // An input answered in an earlier run is never outstanding again.
        if (Option.isNone(yield* read(executionId, answer(options.key)))) {
          const request = yield* Effect.orDie(decodeInputRequest(options.request))
          yield* recordInput({ kind: "input", key: options.key, request })
        }
        // Durable races run their branches with their own instance of this execution.
        const caller = Option.filter(
          yield* Effect.serviceOption(WorkflowEngine.WorkflowInstance),
          (caller) => caller.executionId === executionId
        )
        const current = Option.getOrElse(caller, () => instance)
        awaiting.add(options.key)
        const response = yield* DurableDeferred.await(answer(options.key)).pipe(
          Effect.onInterrupt(() => {
            // Cancellation keeps the input, suspension keeps every awaited input, and a lost race withdraws it.
            if (instance.interrupted) return Effect.void
            if (current.suspended || instance.suspended) return reconcile
            awaiting.delete(options.key)
            return recordInput({ kind: "withdrawn", key: options.key })
          }),
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.provideService(WorkflowEngine.WorkflowInstance, current)
        )
        awaiting.delete(options.key)
        return yield* Schema.decodeUnknownEffect(options.response)(response)
      }),
      setStatusMessage: (message) =>
        lock.withPermits(1)(Effect.gen(function*() {
          const current = log ??= yield* readLog(executionId)
          for (let index = statusCursor; index < current.length; index++) {
            const recorded = current[index]
            if (recorded.kind === "status" && recorded.message === message) {
              statusCursor = index + 1
              return
            }
          }
          statusCursor = (yield* append(message === undefined ? { kind: "status" } : { kind: "status", message })) + 1
        }))
    }

    // The final change records when the task finished and clears its inputs.
    const finish = lock.withPermits(1)(Effect.gen(function*() {
      const current = log ??= yield* readLog(executionId)
      if (!current.some((recorded) => recorded.kind === "finished")) yield* append({ kind: "finished" })
    }))

    return { taskContext, finish }
  })

  return { context, state, update, read, write }
}

/** @internal */
import * as Cache from "../../Cache.ts"
import * as Context from "../../Context.ts"
import * as DateTime from "../../DateTime.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Option from "../../Option.ts"
import * as Schedule from "../../Schedule.ts"
import * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import * as Semaphore from "../../Semaphore.ts"
import * as DurableDeferred from "../../workflow/DurableDeferred.ts"
import * as Workflow from "../../workflow/Workflow.ts"
import * as WorkflowEngine from "../../workflow/WorkflowEngine.ts"
import * as McpSchema from "../McpSchema.ts"
import type * as McpTasks from "../McpTasks.ts"
import { TaskError } from "./mcpTasksBinding.ts"

/** @internal */
export const CurrentRaces = Context.Reference<ReadonlyArray<string>>("effect/ai/McpTasks/WorkflowRaces", {
  defaultValue: () => []
})

const InputRequest = Schema.Union([
  Schema.Struct({ method: Schema.Literal("roots/list"), params: Schema.optionalKey(Schema.JsonObject) }),
  Schema.Struct({ method: Schema.Literal("elicitation/create"), params: Schema.JsonObject }),
  Schema.Struct({ method: Schema.Literal("sampling/createMessage"), params: Schema.JsonObject })
])
const Event = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("input"),
    key: Schema.String,
    request: InputRequest,
    scopes: Schema.optionalKey(Schema.Array(Schema.String)),
    at: Schema.DateTimeUtc
  }),
  Schema.Struct({
    kind: Schema.Literal("status"),
    key: Schema.String,
    message: Schema.NullOr(Schema.String),
    at: Schema.DateTimeUtc
  })
])
type Event = typeof Event.Type
const event = (index: number) => DurableDeferred.make(`mcp/task/events/${index}`, { success: Event })
const InputOutcome = Schema.Union([
  Schema.Struct({ state: Schema.Literal("received"), response: Schema.JsonObject, at: Schema.DateTimeUtc }),
  Schema.Struct({ state: Schema.Literal("withdrawn"), at: Schema.DateTimeUtc })
])
const outcome = (key: string) =>
  DurableDeferred.make(`mcp/task/input/${JSON.stringify(key)}`, { success: InputOutcome })

const cancellation = DurableDeferred.make("mcp/task/cancellation", { success: Schema.Void })

const invalid = (message: string) => new TaskError({ code: McpSchema.INVALID_PARAMS_ERROR_CODE, message })

/** @internal */
export const make = Effect.fnUntraced(function*<
  Name extends string,
  Payload extends Workflow.AnyStructSchema,
  Success extends Schema.Codec<unknown, unknown>,
  Error extends Schema.Codec<unknown, unknown>
>(
  engine: WorkflowEngine.WorkflowEngine["Service"],
  workflow: Workflow.Workflow<Name, Payload, Success, Error>,
  scope: Scope.Closeable
) {
  const services = (instance: WorkflowEngine.WorkflowInstance["Service"]) =>
    Context.make(WorkflowEngine.WorkflowEngine, engine).pipe(Context.add(WorkflowEngine.WorkflowInstance, instance))
  const external = (executionId: string) =>
    services(WorkflowEngine.WorkflowInstance.initial(workflow, executionId, { scope }))
  const read = <S extends Schema.Constraint>(executionId: string, deferred: DurableDeferred.DurableDeferred<S>) =>
    engine.deferredResult(deferred).pipe(
      Effect.provideContext(external(executionId)),
      Effect.flatMap((exit) => Option.isSome(exit) ? Effect.map(exit.value, Option.some) : Effect.succeedNone)
    )
  const wait = <S extends Schema.Constraint>(executionId: string, deferred: DurableDeferred.DurableDeferred<S>) =>
    read(executionId, deferred).pipe(
      Effect.repeat({ while: Option.isNone, schedule: Schedule.spaced("10 millis") }),
      Effect.flatMap(Effect.fromOption),
      Effect.orDie
    )
  const write = <S extends Schema.Constraint>(
    instance: WorkflowEngine.WorkflowInstance["Service"],
    deferred: DurableDeferred.DurableDeferred<S>,
    value: S["Type"]
  ) =>
    Effect.gen(function*() {
      yield* DurableDeferred.succeed(deferred, {
        token: DurableDeferred.tokenFromExecutionId(deferred, instance),
        value
      })
      return yield* wait(instance.executionId, deferred)
    }).pipe(Effect.provideContext(services(instance)))

  type InputState = { readonly state: "pending" } | typeof InputOutcome.Type
  interface Projection {
    readonly gate: Semaphore.Semaphore
    offset: number
    readonly operations: Set<string>
    readonly inputs: Map<string, { readonly event: Extract<Event, { kind: "input" }>; state: InputState }>
    readonly pending: Set<string>
    statusMessage: string | undefined
    lastUpdatedAt: DateTime.Utc | undefined
  }
  const projections = yield* Cache.make({
    capacity: 256,
    lookup: (_executionId: string): Effect.Effect<Projection> =>
      Effect.map(Semaphore.make(1), (gate) => ({
        gate,
        offset: 0,
        operations: new Set(),
        inputs: new Map(),
        pending: new Set(),
        statusMessage: undefined,
        lastUpdatedAt: undefined
      }))
  })
  const withProjection = <A, E, R>(executionId: string, f: (state: Projection) => Effect.Effect<A, E, R>) =>
    Effect.flatMap(
      Cache.get(projections, executionId),
      (state) => Semaphore.withPermit(state.gate, Effect.suspend(() => f(state)))
    )
  const advance = (state: Projection, at: DateTime.Utc) => {
    if (!state.lastUpdatedAt || at.epochMilliseconds > state.lastUpdatedAt.epochMilliseconds) state.lastUpdatedAt = at
  }
  const consume = (state: Projection, entry: Event) => {
    state.offset++
    const operation = JSON.stringify([entry.kind, entry.key])
    if (state.operations.has(operation)) return
    state.operations.add(operation)
    advance(state, entry.at)
    if (entry.kind === "status") state.statusMessage = entry.message ?? undefined
    else {
      state.inputs.set(entry.key, { event: entry, state: { state: "pending" } })
      state.pending.add(entry.key)
    }
  }
  const refreshEvents = Effect.fnUntraced(function*(executionId: string, state: Projection) {
    for (;;) {
      const value = yield* read(executionId, event(state.offset))
      if (Option.isNone(value)) return
      consume(state, value.value)
    }
  })
  const refreshInput = Effect.fnUntraced(function*(executionId: string, state: Projection, key: string) {
    const input = state.inputs.get(key)
    if (!input) return yield* Effect.die("Unknown task input key")
    if (input.state.state !== "pending") return input.state
    const resolved = yield* read(executionId, outcome(key))
    if (Option.isSome(resolved)) input.state = resolved.value
    if (input.state.state === "pending") {
      for (const name of input.event.scopes ?? []) {
        const completed = yield* engine.deferredResult(DurableDeferred.make(name, {
          success: Schema.Unknown,
          error: Schema.Unknown
        })).pipe(Effect.provideContext(external(executionId)))
        if (Option.isNone(completed)) continue
        input.state = yield* write(
          WorkflowEngine.WorkflowInstance.initial(workflow, executionId, { scope }),
          outcome(key),
          {
            state: "withdrawn",
            at: yield* DateTime.now
          }
        )
        break
      }
    }
    if (input.state.state !== "pending") {
      state.pending.delete(key)
      state.inputs.delete(key)
      advance(state, input.state.at)
    }
    return input.state
  })
  const snapshot = (executionId: string) =>
    withProjection(executionId, (state) =>
      Effect.gen(function*() {
        yield* refreshEvents(executionId, state)
        const inputRequests: Record<string, McpSchema.McpInputRequest> = Object.create(null)
        for (const key of state.pending) {
          const input = yield* refreshInput(executionId, state, key)
          const entry = state.inputs.get(key)
          if (input.state === "pending" && entry) inputRequests[key] = entry.event.request
        }
        return { inputRequests, statusMessage: state.statusMessage, lastUpdatedAt: state.lastUpdatedAt }
      }))
  const context = Effect.gen(function*() {
    const instance = yield* WorkflowEngine.WorkflowInstance
    const keys = new Set<string>()
    const statusKeys = new Set<string>()
    const append = (
      entry: Omit<Extract<Event, { kind: "input" }>, "at"> | Omit<Extract<Event, { kind: "status" }>, "at">
    ) =>
      withProjection(instance.executionId, (state) =>
        Effect.gen(function*() {
          for (;;) {
            yield* refreshEvents(instance.executionId, state)
            if (state.operations.has(JSON.stringify([entry.kind, entry.key]))) return
            const actual = yield* write(instance, event(state.offset), { ...entry, at: yield* DateTime.now })
            consume(state, actual)
            if (actual.kind === entry.kind && actual.key === entry.key) return
          }
        }))
    return {
      requestInput: Effect.fnUntraced(function*<A, R>(options: {
        readonly key: string
        readonly request: McpSchema.McpInputRequest
        readonly response: Schema.Decoder<A, R>
      }) {
        if (keys.has(options.key)) return yield* Effect.die(new Error("Task input requires a unique request key"))
        keys.add(options.key)
        const caller = yield* Effect.serviceOption(WorkflowEngine.WorkflowInstance)
        const owner = Option.isSome(caller) && caller.value.executionId === instance.executionId
          ? caller.value
          : instance
        const current = services(owner)
        const races = yield* CurrentRaces
        const request = yield* Schema.decodeUnknownEffect(InputRequest)(options.request).pipe(Effect.orDie)
        return yield* Effect.gen(function*() {
          // Register publication before yielding so sibling inputs can start
          // before the first durable wait suspends the workflow run.
          yield* Workflow.wrapActivityResult(
            Effect.andThen(Effect.yieldNow, append({ kind: "input", key: options.key, request, scopes: races })),
            () => false
          ).pipe(Effect.provideContext(current))
          const value = yield* DurableDeferred.raceAll({
            name: `mcp/task/input/${JSON.stringify(options.key)}`,
            success: Schema.NullOr(InputOutcome),
            error: Schema.Never,
            effects: [
              DurableDeferred.await(outcome(options.key)),
              DurableDeferred.await(cancellation).pipe(Effect.as(null))
            ]
          }).pipe(Effect.provideContext(current))
          if (value === null) {
            instance.interrupted = true
            return yield* Effect.interrupt
          }
          if (value.state === "withdrawn") return yield* Effect.interrupt
          return yield* Workflow.wrapActivityResult(
            Schema.decodeUnknownEffect(options.response)(value.response),
            () => false
          ).pipe(Effect.provideContext(current))
        }).pipe(
          Effect.onInterrupt(() =>
            owner.suspended || instance.suspended || instance.abandoned || instance.interrupted
              ? Effect.void
              : Effect.asVoid(Effect.flatMap(DateTime.now, (now) =>
                write(instance, outcome(options.key), { state: "withdrawn", at: now })))
          )
        )
      }),
      setStatusMessage: Effect.fnUntraced(function*(key, message) {
        if (statusKeys.has(key)) return yield* Effect.die(new Error("Task status requires a unique checkpoint key"))
        statusKeys.add(key)
        const caller = yield* Effect.serviceOption(WorkflowEngine.WorkflowInstance)
        const owner = Option.isSome(caller) && caller.value.executionId === instance.executionId
          ? caller.value
          : instance
        const current = services(owner)
        yield* Workflow.wrapActivityResult(
          append({ kind: "status", key, message: message ?? null }),
          () => false
        ).pipe(Effect.provideContext(current))
      })
    } satisfies McpTasks.TaskContext["Service"]
  })

  const update = Effect.fnUntraced(function*(executionId: string, responses: McpTasks.UpdateRequest["inputResponses"]) {
    yield* withProjection(executionId, (state) =>
      Effect.gen(function*() {
        yield* refreshEvents(executionId, state)
        for (const [key, response] of Object.entries(responses)) {
          if (!state.inputs.has(key) || (yield* refreshInput(executionId, state, key)).state !== "pending") continue
          if (Option.isSome(yield* read(executionId, cancellation))) return
          const result = yield* engine.poll(workflow, executionId)
          if (Option.isSome(result) && result.value._tag === "Complete") return
          const encoded = yield* Schema.decodeUnknownEffect(Schema.JsonObject)(response).pipe(
            Effect.mapError(() => invalid(`Invalid response for task input '${key}'`))
          )
          yield* write(WorkflowEngine.WorkflowInstance.initial(workflow, executionId, { scope }), outcome(key), {
            state: "received",
            response: encoded,
            at: yield* DateTime.now
          })
        }
      }))
  })
  const cancel = (executionId: string) =>
    engine.deferredDone(cancellation, {
      workflowName: workflow._tag,
      executionId,
      deferredName: cancellation.name,
      exit: Exit.void
    })
  return { context, snapshot, update, cancel }
})

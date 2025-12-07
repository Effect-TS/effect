/**
 * @since 1.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import type * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import type * as Types from "effect/Types"
import * as DurableDeferred from "./DurableDeferred.js"
import { makeHashDigest } from "./internal/crypto.js"
import * as Workflow from "./Workflow.js"
import type { WorkflowEngine, WorkflowInstance } from "./WorkflowEngine.js"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/workflow/Activity")

/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Models
 */
export interface Activity<
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never,
  R = never
> extends
  Effect.Effect<
    Success["Type"],
    Error["Type"],
    Success["Context"] | Error["Context"] | R | WorkflowEngine | WorkflowInstance
  >
{
  readonly [TypeId]: TypeId
  readonly name: string
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly exitSchema: Schema.Schema<
    Exit.Exit<Success["Type"], Error["Type"]>,
    Exit.Exit<Success["Encoded"], Error["Encoded"]>,
    Success["Context"] | Error["Context"]
  >
  readonly execute: Effect.Effect<
    Success["Type"],
    Error["Type"],
    Success["Context"] | Error["Context"] | R | Scope | WorkflowEngine | WorkflowInstance
  >
  readonly executeEncoded: Effect.Effect<
    Success["Encoded"],
    Error["Encoded"],
    Success["Context"] | Error["Context"] | R | Scope | WorkflowEngine | WorkflowInstance
  >
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Any {
  readonly [TypeId]: TypeId
  readonly name: string
  readonly successSchema: Schema.Schema.Any
  readonly errorSchema: Schema.Schema.All
  readonly execute: Effect.Effect<any, any, any>
  readonly executeEncoded: Effect.Effect<any, any, any>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  R,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(options: {
  readonly name: string
  readonly success?: Success | undefined
  readonly error?: Error | undefined
  readonly execute: Effect.Effect<Success["Type"], Error["Type"], R>
  readonly interruptRetryPolicy?: Schedule.Schedule<any, Cause.Cause<unknown>> | undefined
}): Activity<Success, Error, Exclude<R, WorkflowInstance | WorkflowEngine | Scope>> => {
  const successSchema = options.success ?? Schema.Void as any as Success
  const errorSchema = options.error ?? Schema.Never as any as Error
  // eslint-disable-next-line prefer-const
  let execute!: Effect.Effect<Success["Type"], Error["Type"], any>
  const executeWithoutInterrupt = retryOnInterrupt(
    options.name,
    options.interruptRetryPolicy
  )(options.execute)
  const self: Activity<Success, Error, Exclude<R, WorkflowInstance | WorkflowEngine>> = {
    ...Effectable.CommitPrototype,
    [TypeId]: TypeId,
    name: options.name,
    successSchema,
    errorSchema,
    exitSchema: Schema.ExitFromSelf({
      success: successSchema,
      failure: errorSchema,
      defect: Schema.Defect
    }),
    execute: executeWithoutInterrupt,
    executeEncoded: Effect.matchEffect(executeWithoutInterrupt, {
      onFailure: (error) => Effect.flatMap(Effect.orDie(Schema.encode(self.errorSchema as any)(error)), Effect.fail),
      onSuccess: (value) => Effect.orDie(Schema.encode(self.successSchema)(value))
    }),
    commit() {
      return execute
    }
  } as any
  execute = makeExecute(self)
  return self
}

const interruptRetryPolicy = Schedule.exponential(100, 1.5).pipe(
  Schedule.union(Schedule.spaced("10 seconds")),
  Schedule.union(Schedule.recurs(10)),
  Schedule.whileInput((cause: Cause.Cause<unknown>) => Cause.isInterrupted(cause))
)

const retryOnInterrupt = (
  name: string,
  policy: Schedule.Schedule<any, Cause.Cause<unknown>> = interruptRetryPolicy
) =>
<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.sandbox,
    Effect.retry(policy),
    Effect.catchAll((cause) => {
      if (!Cause.isInterrupted(cause)) return Effect.failCause(cause)
      return Effect.die(`Activity "${name}" interrupted and retry attempts exhausted`)
    })
  )

/**
 * @since 1.0.0
 * @category Error handling
 */
export const retry: {
  <E, O extends Types.NoExcessProperties<Omit<Effect.Retry.Options<E>, "schedule">, O>>(
    options: O
  ): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Retry.Return<R, E, A, O>
  <A, E, R, O extends Types.NoExcessProperties<Omit<Effect.Retry.Options<E>, "schedule">, O>>(
    self: Effect.Effect<A, E, R>,
    options: O
  ): Effect.Retry.Return<R, E, A, O>
} = dual(
  2,
  (effect: Effect.Effect<any, any, any>, options: {}) =>
    Effect.suspend(() => {
      let attempt = 1
      return Effect.suspend(() => Effect.provideService(effect, CurrentAttempt, attempt++)).pipe(
        Effect.retry(options)
      )
    })
)

/**
 * @since 1.0.0
 * @category Attempts
 */
export class CurrentAttempt extends Context.Reference<CurrentAttempt>()("@effect/workflow/Activity/CurrentAttempt", {
  defaultValue: () => 1
}) {}

/**
 * @since 1.0.0
 * @category Idempotency
 */
export const idempotencyKey: (
  name: string,
  options?: {
    readonly includeAttempt?: boolean | undefined
  } | undefined
) => Effect.Effect<string, never, WorkflowInstance> = Effect.fnUntraced(function*(name: string, options?: {
  readonly includeAttempt?: boolean | undefined
}) {
  const instance = yield* InstanceTag
  let key = `${instance.executionId}`
  if (options?.includeAttempt) {
    const attempt = yield* CurrentAttempt
    key += `-${attempt}`
  }
  key += `-${name}`
  return yield* makeHashDigest(key)
})

/**
 * @since 1.0.0
 * @category Racing
 */
export const raceAll = <const Activities extends NonEmptyReadonlyArray<Any>>(
  name: string,
  activities: Activities
): Effect.Effect<
  (Activities[number] extends Activity<infer _A, infer _E, infer _R> ? _A["Type"] : never),
  (Activities[number] extends Activity<infer _A, infer _E, infer _R> ? _E["Type"] : never),
  | (Activities[number] extends Activity<infer Success, infer Error, infer R>
    ? Success["Context"] | Error["Context"] | R
    : never)
  | WorkflowEngine
  | WorkflowInstance
> =>
  DurableDeferred.raceAll({
    name: `Activity/${name}`,
    success: Schema.Union(
      ...activities.map((activity) => activity.successSchema)
    ),
    error: Schema.Union(
      ...activities.map((activity) => activity.errorSchema)
    ),
    effects: activities as any
  }) as any

// -----------------------------------------------------------------------------
// internal
// -----------------------------------------------------------------------------

const EngineTag = Context.GenericTag<WorkflowEngine, WorkflowEngine["Type"]>(
  "@effect/workflow/WorkflowEngine" satisfies typeof WorkflowEngine.key
)
const InstanceTag = Context.GenericTag<WorkflowInstance, WorkflowInstance["Type"]>(
  "@effect/workflow/WorkflowEngine/WorkflowInstance" satisfies typeof WorkflowInstance.key
)

const makeExecute = Effect.fnUntraced(function*<
  R,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(activity: Activity<Success, Error, R>) {
  const engine = yield* EngineTag
  const instance = yield* InstanceTag
  const attempt = yield* CurrentAttempt
  yield* Effect.annotateCurrentSpan({ executionId: instance.executionId })
  const result = yield* Workflow.wrapActivityResult(
    engine.activityExecute(activity, attempt),
    (_) => _._tag === "Suspended"
  )
  if (result._tag === "Suspended") {
    return yield* Workflow.suspend(instance)
  }
  return yield* result.exit
}, (effect, activity) =>
  Effect.withSpan(effect, activity.name, {
    captureStackTrace: false
  }))

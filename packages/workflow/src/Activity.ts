/**
 * @since 1.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import type * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
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
}): Activity<Success, Error, Exclude<R, WorkflowInstance | WorkflowEngine | Scope>> => {
  const successSchema = options.success ?? Schema.Void as any as Success
  const errorSchema = options.error ?? Schema.Never as any as Error
  // eslint-disable-next-line prefer-const
  let execute!: Effect.Effect<Success["Type"], Error["Type"], any>
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
    execute: options.execute,
    executeEncoded: Effect.matchEffect(options.execute, {
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

/**
 * @since 1.0.0
 * @category Error handling
 */
export const retry: typeof Effect.retry = dual(
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
 * @category Execution ID
 */
export const executionIdWithAttempt: Effect.Effect<
  string,
  never,
  WorkflowInstance
> = Effect.gen(function*() {
  const instance = yield* InstanceTag
  const attempt = yield* CurrentAttempt
  return yield* makeHashDigest(`${instance.executionId}-${attempt}`)
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
  const result = yield* Workflow.wrapActivityResult(
    engine.activityExecute({
      activity,
      attempt
    }),
    (_) => _._tag === "Suspended"
  )
  if (result._tag === "Suspended") {
    instance.suspended = true
    return yield* Effect.interrupt
  }
  const exit = yield* Effect.orDie(
    Schema.decode(activity.exitSchema)(result.exit)
  )
  return yield* exit
})

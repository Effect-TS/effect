/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { dual } from "effect/Function"
import * as Schema from "effect/Schema"
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
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All,
  R
> extends Effect.Effect<Success["Type"], Error["Type"], R | WorkflowEngine | WorkflowInstance> {
  readonly [TypeId]: TypeId
  readonly name: string
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly execute: Effect.Effect<Success["Type"], Error["Type"], R>
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
  readonly success?: Success
  readonly error?: Error
  readonly execute: Effect.Effect<Success["Type"], Error["Type"], R>
}): Activity<Success, Error, R> => {
  // eslint-disable-next-line prefer-const
  let execute!: Effect.Effect<Success["Type"], Error["Type"], any>
  const self: Activity<Success, Error, R> = {
    ...Effectable.CommitPrototype,
    [TypeId]: TypeId,
    name: options.name,
    successSchema: options.success ?? Schema.Void as any,
    errorSchema: options.error ?? Schema.Never as any,
    execute: options.execute,
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
      let attempt = 0
      return Effect.suspend(() => Effect.provideService(effect, CurrentAttempt, attempt++)).pipe(
        Effect.retry(options)
      )
    })
)

// -----------------------------------------------------------------------------
// internal
// -----------------------------------------------------------------------------

const EngineTag = Context.GenericTag<WorkflowEngine, WorkflowEngine["Type"]>(
  "@effect/workflow/WorkflowEngine" satisfies typeof WorkflowEngine.key
)

class CurrentAttempt extends Context.Reference<CurrentAttempt>()("@effect/workflow/Activity/CurrentAttempt", {
  defaultValue: () => 0
}) {}

const makeExecute = <
  R,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(activity: Activity<Success, Error, R>) =>
  Effect.gen(function*() {
    const engine = yield* EngineTag
    const attempt = yield* CurrentAttempt
    return yield* engine.activityExecute({
      activity,
      attempt
    })
  })

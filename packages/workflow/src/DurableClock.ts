/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Schema from "effect/Schema"
import * as DurableDeferred from "./DurableDeferred.js"
import type { WorkflowEngine, WorkflowInstance } from "./WorkflowEngine.js"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/workflow/DurableClock")

/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Models
 */
export interface DurableClock {
  readonly [TypeId]: TypeId
  readonly name: string
  readonly duration: Duration.Duration
  readonly deferred: DurableDeferred.DurableDeferred<typeof Schema.Void>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  readonly name: string
  readonly duration: Duration.DurationInput
}): DurableClock => ({
  [TypeId]: TypeId,
  name: options.name,
  duration: Duration.decode(options.duration),
  deferred: DurableDeferred.make(`DurableClock/${options.name}`)
})

const EngineTag = Context.GenericTag<WorkflowEngine, WorkflowEngine["Type"]>(
  "@effect/workflow/WorkflowEngine" satisfies typeof WorkflowEngine.key
)

const InstanceTag = Context.GenericTag<WorkflowInstance, WorkflowInstance["Type"]>(
  "@effect/workflow/WorkflowEngine/WorkflowInstance" satisfies typeof WorkflowInstance.key
)

/**
 * @since 1.0.0
 * @category Sleeping
 */
export const sleep: (
  options: {
    readonly name: string
    readonly duration: Duration.DurationInput
  }
) => Effect.Effect<
  void,
  never,
  WorkflowEngine | WorkflowInstance
> = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly duration: Duration.DurationInput
}) {
  const engine = yield* EngineTag
  const instance = yield* InstanceTag
  const clock = make(options)
  yield* engine.scheduleClock({
    workflow: instance.workflow,
    executionId: instance.executionId,
    clock
  })
  return yield* DurableDeferred.await(clock.deferred)
})

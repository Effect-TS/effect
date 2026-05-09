/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type * as Schema from "effect/Schema"
import * as Activity from "./Activity.js"
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
    /**
     * If the duration is less than or equal to this threshold, the clock will
     * be executed in memory.
     *
     * Defaults to 60 seconds.
     */
    readonly inMemoryThreshold?: Duration.DurationInput | undefined
  }
) => Effect.Effect<
  void,
  never,
  WorkflowEngine | WorkflowInstance
> = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly duration: Duration.DurationInput
  readonly inMemoryThreshold?: Duration.DurationInput | undefined
}) {
  const duration = Duration.decode(options.duration)
  if (Duration.isZero(duration)) {
    return
  }

  const inMemoryThreshold = options.inMemoryThreshold
    ? Duration.decode(options.inMemoryThreshold)
    : defaultInMemoryThreshold

  if (Duration.lessThanOrEqualTo(duration, inMemoryThreshold)) {
    return yield* Activity.make({
      name: `DurableClock/${options.name}`,
      execute: Effect.sleep(duration)
    })
  }

  const engine = yield* EngineTag
  const instance = yield* InstanceTag
  const clock = make(options)
  yield* engine.scheduleClock(instance.workflow, {
    executionId: instance.executionId,
    clock
  })
  return yield* DurableDeferred.await(clock.deferred)
})

const defaultInMemoryThreshold = Duration.seconds(60)

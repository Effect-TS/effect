/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import type { ScheduleDriverTypeId, ScheduleTypeId } from "./impl/Schedule.js"
import type { Pipeable } from "./Pipeable.js"
import type { ScheduleDecision } from "./ScheduleDecision.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Schedule.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Schedule.js"

/**
 * @since 2.0.0
 */
export declare namespace Schedule {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Schedule.js"
}
/**
 * A `Schedule<Env, In, Out>` defines a recurring schedule, which consumes
 * values of type `In`, and which returns values of type `Out`.
 *
 * Schedules are defined as a possibly infinite set of intervals spread out over
 * time. Each interval defines a window in which recurrence is possible.
 *
 * When schedules are used to repeat or retry effects, the starting boundary of
 * each interval produced by a schedule is used as the moment when the effect
 * will be executed again.
 *
 * Schedules compose in the following primary ways:
 *
 * - Union: performs the union of the intervals of two schedules
 * - Intersection: performs the intersection of the intervals of two schedules
 * - Sequence: concatenates the intervals of one schedule onto another
 *
 * In addition, schedule inputs and outputs can be transformed, filtered (to
 * terminate a schedule early in response to some input or output), and so
 * forth.
 *
 * A variety of other operators exist for transforming and combining schedules,
 * and the companion object for `Schedule` contains all common types of
 * schedules, both for performing retrying, as well as performing repetition.
 *
 * @category model
 * @since 2.0.0
 */
export interface Schedule<Env, In, Out> extends Schedule.Variance<Env, In, Out>, Pipeable {
  /**
   * Initial State
   */
  readonly initial: any
  /**
   * Schedule Step
   */
  readonly step: (
    now: number,
    input: In,
    state: any
  ) => Effect<Env, never, readonly [any, Out, ScheduleDecision]>
}

/**
 * @since 2.0.0
 */
export declare namespace Schedule {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<Env, In, Out> {
    readonly [ScheduleTypeId]: {
      readonly _Env: (_: never) => Env
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }

  /**
   * @since 2.0.0
   */
  export interface DriverVariance<Env, In, Out> {
    readonly [ScheduleDriverTypeId]: {
      readonly _Env: (_: never) => Env
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }
}

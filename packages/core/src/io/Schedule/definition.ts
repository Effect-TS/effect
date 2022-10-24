import type { Decision } from "@effect/core/io/Schedule/Decision"

/**
 * @category symbol
 * @since 1.0.0
 */
export const ScheduleSym = Symbol.for("@effect/core/io/Schedule")

/**
 * @category symbol
 * @since 1.0.0
 */
export type ScheduleSym = typeof ScheduleSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _Env = Symbol.for("@effect/core/io/Schedule/Env")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _Env = typeof _Env

/**
 * @category symbol
 * @since 1.0.0
 */
export const _In = Symbol.for("@effect/core/io/Schedule/In")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _In = typeof _In

/**
 * @category symbol
 * @since 1.0.0
 */
export const _Out = Symbol.for("@effect/core/io/Schedule/Out")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _Out = typeof _Out

/**
 * @category symbol
 * @since 1.0.0
 */
export const _State = Symbol.for("@effect/core/io/Schedule/State")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _State = typeof _State

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
 * @tsplus type effect/core/io/Schedule
 * @category model
 * @since 1.0.0
 */
export interface Schedule<State, Env, In, Out> {
  readonly [ScheduleSym]: ScheduleSym
  readonly [_Env]: () => Env
  readonly [_In]: (_: In) => void
  readonly [_Out]: () => Out
  readonly initial: State
  readonly step: (
    now: number,
    input: In,
    state: State
  ) => Effect<Env, never, readonly [State, Out, Decision]>
}

/**
 * @tsplus type effect/core/io/Schedule.Ops
 * @category model
 * @since 1.0.0
 */
export interface ScheduleOps {
  $: ScheduleAspects
}
export const Schedule: ScheduleOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Schedule.Aspects
 * @category model
 * @since 1.0.0
 */
export interface ScheduleAspects {}

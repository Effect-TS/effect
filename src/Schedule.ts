/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Chunk from "./Chunk.js"
import type * as Context from "./Context.js"
import type * as Duration from "./Duration.js"
import type * as Effect from "./Effect.js"
import type * as Either from "./Either.js"
import type { LazyArg } from "./Function.js"
import * as internal from "./internal/schedule.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate } from "./Predicate.js"
import type * as ScheduleDecision from "./ScheduleDecision.js"
import type * as Intervals from "./ScheduleIntervals.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ScheduleTypeId: unique symbol = internal.ScheduleTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ScheduleTypeId = typeof ScheduleTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const ScheduleDriverTypeId: unique symbol = internal.ScheduleDriverTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ScheduleDriverTypeId = typeof ScheduleDriverTypeId

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
export interface Schedule<out Env, in In, out Out> extends Schedule.Variance<Env, In, Out>, Pipeable {
  /**
   * Initial State
   */
  readonly initial: any
  /**
   * Schedule Step
   */
  step(
    now: number,
    input: In,
    state: any
  ): Effect.Effect<Env, never, readonly [any, Out, ScheduleDecision.ScheduleDecision]>
}

/**
 * @since 2.0.0
 */
export declare namespace Schedule {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out Env, in In, out Out> {
    readonly [ScheduleTypeId]: {
      readonly _Env: Types.Covariant<Env>
      readonly _In: Types.Contravariant<In>
      readonly _Out: Types.Covariant<Out>
    }
  }

  /**
   * @since 2.0.0
   */
  export interface DriverVariance<out Env, in In, out Out> {
    readonly [ScheduleDriverTypeId]: {
      readonly _Env: Types.Covariant<Env>
      readonly _In: Types.Contravariant<In>
      readonly _Out: Types.Covariant<Out>
    }
  }
}

/**
 * @since 2.0.0
 * @category models
 */
export interface ScheduleDriver<out Env, in In, out Out> extends Schedule.DriverVariance<Env, In, Out> {
  readonly state: Effect.Effect<never, never, unknown>
  readonly last: Effect.Effect<never, Cause.NoSuchElementException, Out>
  readonly reset: Effect.Effect<never, never, void>
  next(input: In): Effect.Effect<Env, Option.Option<never>, Out>
}

/**
 * Constructs a new `Schedule` with the specified `initial` state and the
 * specified `step` function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeWithState: <S, Env, In, Out>(
  initial: S,
  step: (
    now: number,
    input: In,
    state: S
  ) => Effect.Effect<Env, never, readonly [S, Out, ScheduleDecision.ScheduleDecision]>
) => Schedule<Env, In, Out> = internal.makeWithState

/**
 * Returns a new schedule with the given delay added to every interval defined
 * by this schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const addDelay: {
  <Out>(f: (out: Out) => Duration.DurationInput): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, f: (out: Out) => Duration.DurationInput): Schedule<Env, In, Out>
} = internal.addDelay

/**
 * Returns a new schedule with the given effectfully computed delay added to
 * every interval defined by this schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const addDelayEffect: {
  <Out, Env2>(
    f: (out: Out) => Effect.Effect<Env2, never, Duration.DurationInput>
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
  <Env, In, Out, Env2>(
    self: Schedule<Env, In, Out>,
    f: (out: Out) => Effect.Effect<Env2, never, Duration.DurationInput>
  ): Schedule<Env | Env2, In, Out>
} = internal.addDelayEffect

/**
 * The same as `andThenEither`, but merges the output.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const andThen: {
  <Env1, In1, Out2>(
    that: Schedule<Env1, In1, Out2>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env1 | Env, In & In1, Out2 | Out>
  <Env, In, Out, Env1, In1, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env1, In1, Out2>
  ): Schedule<Env | Env1, In & In1, Out | Out2>
} = internal.andThen

/**
 * Returns a new schedule that first executes this schedule to completion, and
 * then executes the specified schedule to completion.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const andThenEither: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Either.Either<Out, Out2>>
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>
  ): Schedule<Env | Env2, In & In2, Either.Either<Out, Out2>>
} = internal.andThenEither

/**
 * Returns a new schedule that maps this schedule to a constant output.
 *
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <Out2>(out: Out2): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out2>
  <Env, In, Out, Out2>(self: Schedule<Env, In, Out>, out: Out2): Schedule<Env, In, Out2>
} = internal.as

/**
 * Returns a new schedule that maps the output of this schedule to unit.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asUnit: <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, void> = internal.asUnit

/**
 * Returns a new schedule that has both the inputs and outputs of this and the
 * specified schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const bothInOut: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<
    Env2 | Env,
    readonly [In, In2], // readonly because contravariant
    [Out, Out2]
  >
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>
  ): Schedule<
    Env | Env2,
    readonly [In, In2], // readonly because contravariant
    [Out, Out2]
  >
} = internal.bothInOut

/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @since 2.0.0
 * @category utils
 */
export const check: {
  <In, Out>(test: (input: In, output: Out) => boolean): <Env>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, test: (input: In, output: Out) => boolean): Schedule<Env, In, Out>
} = internal.check

/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @since 2.0.0
 * @category utils
 */
export const checkEffect: {
  <In, Out, Env2>(
    test: (input: In, output: Out) => Effect.Effect<Env2, never, boolean>
  ): <Env>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
  <Env, In, Out, Env2>(
    self: Schedule<Env, In, Out>,
    test: (input: In, output: Out) => Effect.Effect<Env2, never, boolean>
  ): Schedule<Env | Env2, In, Out>
} = internal.checkEffect

/**
 * A schedule that recurs anywhere, collecting all inputs into a `Chunk`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllInputs: <A>() => Schedule<never, A, Chunk.Chunk<A>> = internal.collectAllInputs

/**
 * Returns a new schedule that collects the outputs of this one into a chunk.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectAllOutputs: <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Chunk.Chunk<Out>> =
  internal.collectAllOutputs

/**
 * A schedule that recurs until the condition f fails, collecting all inputs
 * into a list.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectUntil: <A>(f: Predicate<A>) => Schedule<never, A, Chunk.Chunk<A>> = internal.collectUntil

/**
 * A schedule that recurs until the effectful condition f fails, collecting
 * all inputs into a list.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectUntilEffect: <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
) => Schedule<Env, A, Chunk.Chunk<A>> = internal.collectUntilEffect

/**
 * A schedule that recurs as long as the condition f holds, collecting all
 * inputs into a list.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectWhile: <A>(f: Predicate<A>) => Schedule<never, A, Chunk.Chunk<A>> = internal.collectWhile

/**
 * A schedule that recurs as long as the effectful condition holds, collecting
 * all inputs into a list.
 *
 * @category utils
 * @since 2.0.0
 */
export const collectWhileEffect: <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
) => Schedule<Env, A, Chunk.Chunk<A>> = internal.collectWhileEffect

/**
 * Returns the composition of this schedule and the specified schedule, by
 * piping the output of this one into the input of the other. Effects
 * described by this schedule will always be executed before the effects
 * described by the second schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const compose: {
  <Env2, Out, Out2>(
    that: Schedule<Env2, Out, Out2>
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out2>
  <Env, In, Out, Env2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, Out, Out2>
  ): Schedule<Env | Env2, In, Out2>
} = internal.compose

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapInput: {
  <In, In2>(f: (in2: In2) => In): <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In2, Out>
  <Env, In, Out, In2>(self: Schedule<Env, In, Out>, f: (in2: In2) => In): Schedule<Env, In2, Out>
} = internal.mapInput

/**
 * Transforms the context being provided to this schedule with the
 * specified function.
 *
 * @since 2.0.0
 * @category context
 */
export const mapInputContext: {
  <Env0, Env>(
    f: (env0: Context.Context<Env0>) => Context.Context<Env>
  ): <In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env0, In, Out>
  <Env0, Env, In, Out>(
    self: Schedule<Env, In, Out>,
    f: (env0: Context.Context<Env0>) => Context.Context<Env>
  ): Schedule<Env0, In, Out>
} = internal.mapInputContext

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapInputEffect: {
  <In, Env2, In2>(
    f: (in2: In2) => Effect.Effect<Env2, never, In>
  ): <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In2, Out>
  <Env, In, Out, Env2, In2>(
    self: Schedule<Env, In, Out>,
    f: (in2: In2) => Effect.Effect<Env2, never, In>
  ): Schedule<Env | Env2, In2, Out>
} = internal.mapInputEffect

/**
 * A schedule that always recurs, which counts the number of recurrences.
 *
 * @since 2.0.0
 * @category constructors
 */
export const count: Schedule<never, unknown, number> = internal.count

/**
 * Cron-like schedule that recurs every specified `day` of month. Won't recur
 * on months containing less days than specified in `day` param.
 *
 * It triggers at zero hour of the day. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `day` parameter is validated lazily. Must be in range 1...31.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dayOfMonth: (day: number) => Schedule<never, unknown, number> = internal.dayOfMonth

/**
 * Cron-like schedule that recurs every specified `day` of each week. It
 * triggers at zero hour of the week. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `day` parameter is validated lazily. Must be in range 1 (Monday)...7
 * (Sunday).
 *
 * @since 2.0.0
 * @category constructors
 */
export const dayOfWeek: (day: number) => Schedule<never, unknown, number> = internal.dayOfWeek

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const delayed: {
  (
    f: (duration: Duration.Duration) => Duration.DurationInput
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(
    self: Schedule<Env, In, Out>,
    f: (duration: Duration.Duration) => Duration.DurationInput
  ): Schedule<Env, In, Out>
} = internal.delayed

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @since 2.0.0
 * @category constructors
 */
export const delayedEffect: {
  <Env2>(
    f: (duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.DurationInput>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
  <Env, In, Out, Env2>(
    self: Schedule<Env, In, Out>,
    f: (duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.DurationInput>
  ): Schedule<Env | Env2, In, Out>
} = internal.delayedEffect

/**
 * Takes a schedule that produces a delay, and returns a new schedule that
 * uses this delay to further delay intervals in the resulting schedule.
 *
 * @since 2.0.0
 * @category constructors
 */
export const delayedSchedule: <Env, In>(
  schedule: Schedule<Env, In, Duration.Duration>
) => Schedule<Env, In, Duration.Duration> = internal.delayedSchedule

/**
 * Returns a new schedule that outputs the delay between each occurence.
 *
 * @since 2.0.0
 * @category constructors
 */
export const delays: <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Duration.Duration> =
  internal.delays

/**
 * Returns a new schedule that maps both the input and output.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapBoth: {
  <In, Out, In2, Out2>(
    options: {
      readonly onInput: (in2: In2) => In
      readonly onOutput: (out: Out) => Out2
    }
  ): <Env>(self: Schedule<Env, In, Out>) => Schedule<Env, In2, Out2>
  <Env, In, Out, In2, Out2>(
    self: Schedule<Env, In, Out>,
    options: {
      readonly onInput: (in2: In2) => In
      readonly onOutput: (out: Out) => Out2
    }
  ): Schedule<Env, In2, Out2>
} = internal.mapBoth

/**
 * Returns a new schedule that maps both the input and output.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapBothEffect: {
  <In2, Env2, In, Out, Env3, Out2>(
    options: {
      readonly onInput: (input: In2) => Effect.Effect<Env2, never, In>
      readonly onOutput: (out: Out) => Effect.Effect<Env3, never, Out2>
    }
  ): <Env>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env3 | Env, In2, Out2>
  <Env, In, Out, In2, Env2, Env3, Out2>(
    self: Schedule<Env, In, Out>,
    options: {
      readonly onInput: (input: In2) => Effect.Effect<Env2, never, In>
      readonly onOutput: (out: Out) => Effect.Effect<Env3, never, Out2>
    }
  ): Schedule<Env | Env2 | Env3, In2, Out2>
} = internal.mapBothEffect

/**
 * Returns a driver that can be used to step the schedule, appropriately
 * handling sleeping.
 *
 * @since 2.0.0
 * @category getter
 */
export const driver: <Env, In, Out>(
  self: Schedule<Env, In, Out>
) => Effect.Effect<never, never, ScheduleDriver<Env, In, Out>> = internal.driver

/**
 * A schedule that can recur one time, the specified amount of time into the
 * future.
 *
 * @since 2.0.0
 * @category constructors
 */
export const duration: (duration: Duration.DurationInput) => Schedule<never, unknown, Duration.Duration> =
  internal.duration

/**
 * Returns a new schedule that performs a geometric union on the intervals
 * defined by both schedules.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const either: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, [Out, Out2]>
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>
  ): Schedule<Env | Env2, In & In2, [Out, Out2]>
} = internal.either

/**
 * The same as `either` followed by `map`.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const eitherWith: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, [Out, Out2]>
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): Schedule<Env | Env2, In & In2, [Out, Out2]>
} = internal.eitherWith

/**
 * A schedule that occurs everywhere, which returns the total elapsed duration
 * since the first step.
 *
 * @since 2.0.0
 * @category constructors
 */
export const elapsed: Schedule<never, unknown, Duration.Duration> = internal.elapsed

/**
 * Returns a new schedule that will run the specified finalizer as soon as the
 * schedule is complete. Note that unlike `Effect.ensuring`, this method does not
 * guarantee the finalizer will be run. The `Schedule` may not initialize or
 * the driver of the schedule may not run to completion. However, if the
 * `Schedule` ever decides not to continue, then the finalizer will be run.
 *
 * @since 2.0.0
 * @category finalization
 */
export const ensuring: {
  <X>(finalizer: Effect.Effect<never, never, X>): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out, X>(self: Schedule<Env, In, Out>, finalizer: Effect.Effect<never, never, X>): Schedule<Env, In, Out>
} = internal.ensuring

/**
 * A schedule that always recurs, but will wait a certain amount between
 * repetitions, given by `base * factor.pow(n)`, where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 *
 * @since 2.0.0
 * @category constructors
 */
export const exponential: (
  base: Duration.DurationInput,
  factor?: number
) => Schedule<never, unknown, Duration.Duration> = internal.exponential

/**
 * A schedule that always recurs, increasing delays by summing the preceding
 * two delays (similar to the fibonacci sequence). Returns the current
 * duration between recurrences.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fibonacci: (one: Duration.DurationInput) => Schedule<never, unknown, Duration.Duration> =
  internal.fibonacci

/**
 * A schedule that recurs on a fixed interval. Returns the number of
 * repetitions of the schedule so far.
 *
 * If the action run between updates takes longer than the interval, then the
 * action will be run immediately, but re-runs will not "pile up".
 *
 * ```
 * |-----interval-----|-----interval-----|-----interval-----|
 * |---------action--------||action|-----|action|-----------|
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const fixed: (interval: Duration.DurationInput) => Schedule<never, unknown, number> = internal.fixed

/**
 * A schedule that always recurs, producing a count of repeats: 0, 1, 2.
 *
 * @since 2.0.0
 * @category constructors
 */
export const forever: Schedule<never, unknown, number> = internal.forever

/**
 * A schedule that recurs once with the specified delay.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromDelay: (delay: Duration.DurationInput) => Schedule<never, unknown, Duration.Duration> =
  internal.fromDelay

/**
 * A schedule that recurs once for each of the specified durations, delaying
 * each time for the length of the specified duration. Returns the length of
 * the current duration between recurrences.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromDelays: (
  delay: Duration.DurationInput,
  ...delays: Array<Duration.DurationInput>
) => Schedule<never, unknown, Duration.Duration> = internal.fromDelays

/**
 * A schedule that always recurs, mapping input values through the specified
 * function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromFunction: <A, B>(f: (a: A) => B) => Schedule<never, A, B> = internal.fromFunction

/**
 * Cron-like schedule that recurs every specified `hour` of each day. It
 * triggers at zero minute of the hour. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `hour` parameter is validated lazily. Must be in range 0...23.
 *
 * @since 2.0.0
 * @category constructors
 */
export const hourOfDay: (hour: number) => Schedule<never, unknown, number> = internal.hourOfDay

/**
 * A schedule that always recurs, which returns inputs as outputs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const identity: <A>() => Schedule<never, A, A> = internal.identity

/**
 * Returns a new schedule that performs a geometric intersection on the
 * intervals defined by both schedules.
 *
 * @since 2.0.0
 * @category utils
 */
export const intersect: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, [Out, Out2]>
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>
  ): Schedule<Env | Env2, In & In2, [Out, Out2]>
} = internal.intersect

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as both schedules want to continue and merging
 * the next intervals according to the specified merge function.
 *
 * @since 2.0.0
 * @category utils
 */
export const intersectWith: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, [Out, Out2]>
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): Schedule<Env | Env2, In & In2, [Out, Out2]>
} = internal.intersectWith

/**
 * Returns a new schedule that randomly modifies the size of the intervals of
 * this schedule.
 *
 * Defaults `min` to `0.8` and `max` to `1.2`.
 *
 * The new interval size is between `min * old interval size` and `max * old
 * interval size`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const jittered: <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out> = internal.jittered

/**
 * Returns a new schedule that randomly modifies the size of the intervals of
 * this schedule.
 *
 * The new interval size is between `min * old interval size` and `max * old
 * interval size`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const jitteredWith: {
  (options: { min?: number; max?: number }): <Env, In, Out>(
    self: Schedule<Env, In, Out>
  ) => Schedule<Env, In, Out>
  <Env, In, Out>(
    self: Schedule<Env, In, Out>,
    options: { min?: number; max?: number }
  ): Schedule<Env, In, Out>
} = internal.jitteredWith

/**
 * A schedule that always recurs, but will repeat on a linear time interval,
 * given by `base * n` where `n` is the number of repetitions so far. Returns
 * the current duration between recurrences.
 *
 * @since 2.0.0
 * @category constructors
 */
export const linear: (base: Duration.DurationInput) => Schedule<never, unknown, Duration.Duration> = internal.linear

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <Out, Out2>(f: (out: Out) => Out2): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out2>
  <Env, In, Out, Out2>(self: Schedule<Env, In, Out>, f: (out: Out) => Out2): Schedule<Env, In, Out2>
} = internal.map

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified effectful function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapEffect: {
  <Out, Env2, Out2>(
    f: (out: Out) => Effect.Effect<Env2, never, Out2>
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out2>
  <Env, In, Out, Env2, Out2>(
    self: Schedule<Env, In, Out>,
    f: (out: Out) => Effect.Effect<Env2, never, Out2>
  ): Schedule<Env | Env2, In, Out2>
} = internal.mapEffect

/**
 * Cron-like schedule that recurs every specified `minute` of each hour. It
 * triggers at zero second of the minute. Producing a count of repeats: 0, 1,
 * 2.
 *
 * NOTE: `minute` parameter is validated lazily. Must be in range 0...59.
 *
 * @since 2.0.0
 * @category constructors
 */
export const minuteOfHour: (minute: number) => Schedule<never, unknown, number> = internal.minuteOfHour

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 *
 * @since 2.0.0
 * @category utils
 */
export const modifyDelay: {
  <Out>(
    f: (out: Out, duration: Duration.Duration) => Duration.DurationInput
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(
    self: Schedule<Env, In, Out>,
    f: (out: Out, duration: Duration.Duration) => Duration.DurationInput
  ): Schedule<Env, In, Out>
} = internal.modifyDelay

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 *
 * @since 2.0.0
 * @category utils
 */
export const modifyDelayEffect: {
  <Out, Env2>(
    f: (out: Out, duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.DurationInput>
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
  <Env, In, Out, Env2>(
    self: Schedule<Env, In, Out>,
    f: (out: Out, duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.DurationInput>
  ): Schedule<Env | Env2, In, Out>
} = internal.modifyDelayEffect

/**
 * Returns a new schedule that applies the current one but runs the specified
 * effect for every decision of this schedule. This can be used to create
 * schedules that log failures, decisions, or computed values.
 *
 * @since 2.0.0
 * @category utils
 */
export const onDecision: {
  <Out, Env2, X>(
    f: (out: Out, decision: ScheduleDecision.ScheduleDecision) => Effect.Effect<Env2, never, X>
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
  <Env, In, Out, Env2, X>(
    self: Schedule<Env, In, Out>,
    f: (out: Out, decision: ScheduleDecision.ScheduleDecision) => Effect.Effect<Env2, never, X>
  ): Schedule<Env | Env2, In, Out>
} = internal.onDecision

/**
 * A schedule that recurs one time.
 *
 * @since 2.0.0
 * @category constructors
 */
export const once: Schedule<never, unknown, void> = internal.once

/**
 * Returns a new schedule that passes through the inputs of this schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const passthrough: <Env, Input, Output>(self: Schedule<Env, Input, Output>) => Schedule<Env, Input, Input> =
  internal.passthrough

/**
 * Returns a new schedule with its context provided to it, so the
 * resulting schedule does not require any context.
 *
 * @since 2.0.0
 * @category context
 */
export const provideContext: {
  <Env>(context: Context.Context<Env>): <In, Out>(self: Schedule<Env, In, Out>) => Schedule<never, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, context: Context.Context<Env>): Schedule<never, In, Out>
} = internal.provideContext

/**
 * Returns a new schedule with the single service it requires provided to it.
 * If the schedule requires multiple services use `provideContext`
 * instead.
 *
 * @since 2.0.0
 * @category context
 */
export const provideService: {
  <T, T1 extends T>(
    tag: any,
    service: T1
  ): <Env, In, Out>(self: Schedule<T | Env, In, Out>) => Schedule<Exclude<Env, T>, In, Out>
  <Env, T, In, Out, T1 extends T>(
    self: Schedule<Env | T, In, Out>,
    tag: any,
    service: T1
  ): Schedule<Exclude<Env, T>, In, Out>
} = internal.provideService

/**
 * A schedule that recurs for until the predicate evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurUntil: <A>(f: Predicate<A>) => Schedule<never, A, A> = internal.recurUntil

/**
 * A schedule that recurs for until the predicate evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurUntilEffect: <Env, A>(f: (a: A) => Effect.Effect<Env, never, boolean>) => Schedule<Env, A, A> =
  internal.recurUntilEffect

/**
 * A schedule that recurs for until the input value becomes applicable to
 * partial function and then map that value with given function.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurUntilOption: <A, B>(pf: (a: A) => Option.Option<B>) => Schedule<never, A, Option.Option<B>> =
  internal.recurUntilOption

/**
 * A schedule that recurs during the given duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurUpTo: (duration: Duration.DurationInput) => Schedule<never, unknown, Duration.Duration> =
  internal.recurUpTo

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurWhile: <A>(f: Predicate<A>) => Schedule<never, A, A> = internal.recurWhile

/**
 * A schedule that recurs for as long as the effectful predicate evaluates to
 * true.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurWhileEffect: <Env, A>(f: (a: A) => Effect.Effect<Env, never, boolean>) => Schedule<Env, A, A> =
  internal.recurWhileEffect

/**
 * A schedule spanning all time, which can be stepped only the specified
 * number of times before it terminates.
 *
 * @category constructors
 * @since 2.0.0
 */
export const recurs: (n: number) => Schedule<never, unknown, number> = internal.recurs

/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduce: {
  <Out, Z>(zero: Z, f: (z: Z, out: Out) => Z): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Z>
  <Env, In, Out, Z>(self: Schedule<Env, In, Out>, zero: Z, f: (z: Z, out: Out) => Z): Schedule<Env, In, Z>
} = internal.reduce

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduceEffect: {
  <Out, Env1, Z>(
    zero: Z,
    f: (z: Z, out: Out) => Effect.Effect<Env1, never, Z>
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env1 | Env, In, Z>
  <Env, In, Out, Env1, Z>(
    self: Schedule<Env, In, Out>,
    zero: Z,
    f: (z: Z, out: Out) => Effect.Effect<Env1, never, Z>
  ): Schedule<Env | Env1, In, Z>
} = internal.reduceEffect

/**
 * Returns a new schedule that loops this one continuously, resetting the
 * state when this schedule is done.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatForever: Schedule<never, unknown, number> = internal.forever

/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 *
 * @since 2.0.0
 * @category utils
 */
export const repetitions: <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, number> =
  internal.repetitions

/**
 * Return a new schedule that automatically resets the schedule to its initial
 * state after some time of inactivity defined by `duration`.
 *
 * @since 2.0.0
 * @category utils
 */
export const resetAfter: {
  (duration: Duration.DurationInput): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, duration: Duration.DurationInput): Schedule<Env, In, Out>
} = internal.resetAfter

/**
 * Resets the schedule when the specified predicate on the schedule output
 * evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const resetWhen: {
  <Out>(f: Predicate<Out>): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, f: Predicate<Out>): Schedule<Env, In, Out>
} = internal.resetWhen

/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 *
 * @since 2.0.0
 * @category destructors
 */
export const run: {
  <In>(
    now: number,
    input: Iterable<In>
  ): <Env, Out>(self: Schedule<Env, In, Out>) => Effect.Effect<Env, never, Chunk.Chunk<Out>>
  <Env, In, Out>(
    self: Schedule<Env, In, Out>,
    now: number,
    input: Iterable<In>
  ): Effect.Effect<Env, never, Chunk.Chunk<Out>>
} = internal.run

/**
 * Cron-like schedule that recurs every specified `second` of each minute. It
 * triggers at zero nanosecond of the second. Producing a count of repeats: 0,
 * 1, 2.
 *
 * NOTE: `second` parameter is validated lazily. Must be in range 0...59.
 *
 * @since 2.0.0
 * @category constructors
 */
export const secondOfMinute: (second: number) => Schedule<never, unknown, number> = internal.secondOfMinute

/**
 * Returns a schedule that recurs continuously, each repetition spaced the
 * specified duration from the last run.
 *
 * @since 2.0.0
 * @category constructors
 */
export const spaced: (duration: Duration.DurationInput) => Schedule<never, unknown, number> = internal.spaced

/**
 * A schedule that does not recur, it just stops.
 *
 * @since 2.0.0
 * @category constructors
 */
export const stop: Schedule<never, unknown, void> = internal.stop

/**
 * Returns a schedule that repeats one time, producing the specified constant
 * value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Schedule<never, unknown, A> = internal.succeed

/**
 * Returns a schedule that repeats one time, producing the specified constant
 * value.
 *
 * @category constructors
 * @since 2.0.0
 */
export const sync: <A>(evaluate: LazyArg<A>) => Schedule<never, unknown, A> = internal.sync

/**
 * Returns a new schedule that effectfully processes every input to this
 * schedule.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapInput: {
  <Env2, In2, X>(
    f: (input: In2) => Effect.Effect<Env2, never, X>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Out>
  <Env, In, Out, Env2, In2, X>(
    self: Schedule<Env, In, Out>,
    f: (input: In2) => Effect.Effect<Env2, never, X>
  ): Schedule<Env | Env2, In & In2, Out>
} = internal.tapInput

/**
 * Returns a new schedule that effectfully processes every output from this
 * schedule.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapOutput: {
  <Out, XO extends Out, Env2, X>(
    f: (out: XO) => Effect.Effect<Env2, never, X>
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
  <Env, In, Out, XO extends Out, Env2, X>(
    self: Schedule<Env, In, Out>,
    f: (out: XO) => Effect.Effect<Env2, never, X>
  ): Schedule<Env | Env2, In, Out>
} = internal.tapOutput

/**
 * Unfolds a schedule that repeats one time from the specified state and
 * iterator.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfold: <A>(initial: A, f: (a: A) => A) => Schedule<never, unknown, A> = internal.unfold

/**
 * Returns a new schedule that performs a geometric union on the intervals
 * defined by both schedules.
 *
 * @since 2.0.0
 * @category utils
 */
export const union: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, [Out, Out2]>
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>
  ): Schedule<Env | Env2, In & In2, [Out, Out2]>
} = internal.union

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as either schedule wants to continue and
 * merging the next intervals according to the specified merge function.
 *
 * @since 2.0.0
 * @category utils
 */
export const unionWith: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, [Out, Out2]>
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): Schedule<Env | Env2, In & In2, [Out, Out2]>
} = internal.unionWith

/**
 * Returns a new schedule that continues until the specified predicate on the
 * input evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const untilInput: {
  <In>(f: Predicate<In>): <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, f: Predicate<In>): Schedule<Env, In, Out>
} = internal.untilInput

/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the input evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const untilInputEffect: {
  <In, Env2>(
    f: (input: In) => Effect.Effect<Env2, never, boolean>
  ): <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
  <Env, In, Out, Env2>(
    self: Schedule<Env, In, Out>,
    f: (input: In) => Effect.Effect<Env2, never, boolean>
  ): Schedule<Env | Env2, In, Out>
} = internal.untilInputEffect

/**
 * Returns a new schedule that continues until the specified predicate on the
 * output evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const untilOutput: {
  <Out>(f: Predicate<Out>): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, f: Predicate<Out>): Schedule<Env, In, Out>
} = internal.untilOutput

/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the output evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const untilOutputEffect: {
  <Out, Env2>(
    f: (out: Out) => Effect.Effect<Env2, never, boolean>
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
  <Env, In, Out, Env2>(
    self: Schedule<Env, In, Out>,
    f: (out: Out) => Effect.Effect<Env2, never, boolean>
  ): Schedule<Env | Env2, In, Out>
} = internal.untilOutputEffect

/**
 * A schedule that recurs during the given duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const upTo: {
  (duration: Duration.DurationInput): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, duration: Duration.DurationInput): Schedule<Env, In, Out>
} = internal.upTo

/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the input evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const whileInput: {
  <In>(f: Predicate<In>): <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, f: Predicate<In>): Schedule<Env, In, Out>
} = internal.whileInput

/**
 * Returns a new schedule that continues for as long the specified effectful
 * predicate on the input evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const whileInputEffect: {
  <In, Env2>(
    f: (input: In) => Effect.Effect<Env2, never, boolean>
  ): <Env, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In, Out>
  <Env, In, Out, Env2>(
    self: Schedule<Env, In, Out>,
    f: (input: In) => Effect.Effect<Env2, never, boolean>
  ): Schedule<Env | Env2, In, Out>
} = internal.whileInputEffect

/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the output evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const whileOutput: {
  <Out>(f: Predicate<Out>): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env, In, Out>
  <Env, In, Out>(self: Schedule<Env, In, Out>, f: Predicate<Out>): Schedule<Env, In, Out>
} = internal.whileOutput

/**
 * Returns a new schedule that continues for as long the specified effectful
 * predicate on the output evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const whileOutputEffect: {
  <Out, Env1>(
    f: (out: Out) => Effect.Effect<Env1, never, boolean>
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env1 | Env, In, Out>
  <Env, In, Out, Env1>(
    self: Schedule<Env, In, Out>,
    f: (out: Out) => Effect.Effect<Env1, never, boolean>
  ): Schedule<Env | Env1, In, Out>
} = internal.whileOutputEffect

/**
 * A schedule that divides the timeline to `interval`-long windows, and sleeps
 * until the nearest window boundary every time it recurs.
 *
 * For example, `windowed(Duration.seconds(10))` would produce a schedule as
 * follows:
 *
 * ```
 *      10s        10s        10s       10s
 * |----------|----------|----------|----------|
 * |action------|sleep---|act|-sleep|action----|
 * ```
 *
 * @since 2.0.0
 * @category constructors
 */
export const windowed: (interval: Duration.DurationInput) => Schedule<never, unknown, number> = internal.windowed

/**
 * The same as `intersect` but ignores the right output.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Out>
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>
  ): Schedule<Env | Env2, In & In2, Out>
} = internal.zipLeft

/**
 * The same as `intersect` but ignores the left output.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <Env2, In2, Out2>(
    that: Schedule<Env2, In2, Out2>
  ): <Env, In, Out>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Out2>
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>
  ): Schedule<Env | Env2, In & In2, Out2>
} = internal.zipRight

/**
 * Equivalent to `intersect` followed by `map`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <Env2, In2, Out2, Out, Out3>(
    that: Schedule<Env2, In2, Out2>,
    f: (out: Out, out2: Out2) => Out3
  ): <Env, In>(self: Schedule<Env, In, Out>) => Schedule<Env2 | Env, In & In2, Out3>
  <Env, In, Out, Env2, In2, Out2, Out3>(
    self: Schedule<Env, In, Out>,
    that: Schedule<Env2, In2, Out2>,
    f: (out: Out, out2: Out2) => Out3
  ): Schedule<Env | Env2, In & In2, Out3>
} = internal.zipWith

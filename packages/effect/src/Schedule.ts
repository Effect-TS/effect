/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Chunk from "./Chunk.js"
import type * as Context from "./Context.js"
import type * as Cron from "./Cron.js"
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
 * A `Schedule<Out, In, R>` defines a recurring schedule, which consumes
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
export interface Schedule<out Out, in In = unknown, out R = never> extends Schedule.Variance<Out, In, R>, Pipeable {
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
  ): Effect.Effect<readonly [any, Out, ScheduleDecision.ScheduleDecision], never, R>
}

/**
 * @since 2.0.0
 */
export declare namespace Schedule {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<out Out, in In, out R> {
    readonly [ScheduleTypeId]: {
      readonly _Out: Types.Covariant<Out>
      readonly _In: Types.Contravariant<In>
      readonly _R: Types.Covariant<R>
    }
  }

  /**
   * @since 2.0.0
   */
  export interface DriverVariance<out Out, in In, out R> {
    readonly [ScheduleDriverTypeId]: {
      readonly _Out: Types.Covariant<Out>
      readonly _In: Types.Contravariant<In>
      readonly _R: Types.Covariant<R>
    }
  }
}

/**
 * @since 2.0.0
 * @category models
 */
export interface ScheduleDriver<out Out, in In = unknown, out R = never> extends Schedule.DriverVariance<Out, In, R> {
  readonly state: Effect.Effect<unknown>
  readonly last: Effect.Effect<Out, Cause.NoSuchElementException>
  readonly reset: Effect.Effect<void>
  next(input: In): Effect.Effect<Out, Option.Option<never>, R>
}

/**
 * Constructs a new `Schedule` with the specified `initial` state and the
 * specified `step` function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeWithState: <S, In, Out, R = never>(
  initial: S,
  step: (
    now: number,
    input: In,
    state: S
  ) => Effect.Effect<readonly [S, Out, ScheduleDecision.ScheduleDecision], never, R>
) => Schedule<Out, In, R> = internal.makeWithState

/**
 * Returns a new schedule with the given delay added to every interval defined
 * by this schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const addDelay: {
  <Out>(f: (out: Out) => Duration.DurationInput): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: (out: Out) => Duration.DurationInput): Schedule<Out, In, R>
} = internal.addDelay

/**
 * Returns a new schedule with the given effectfully computed delay added to
 * every interval defined by this schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const addDelayEffect: {
  <Out, R2>(
    f: (out: Out) => Effect.Effect<Duration.DurationInput, never, R2>
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, R2>(
    self: Schedule<Out, In, R>,
    f: (out: Out) => Effect.Effect<Duration.DurationInput, never, R2>
  ): Schedule<Out, In, R | R2>
} = internal.addDelayEffect

/**
 * The same as `andThenEither`, but merges the output.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const andThen: {
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out2 | Out, In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>
  ): Schedule<Out | Out2, In & In2, R | R2>
} = internal.andThen

/**
 * Returns a new schedule that first executes this schedule to completion, and
 * then executes the specified schedule to completion.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const andThenEither: {
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Either.Either<Out2, Out>, In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>
  ): Schedule<Either.Either<Out2, Out>, In & In2, R | R2>
} = internal.andThenEither

/**
 * Returns a new schedule that maps this schedule to a constant output.
 *
 * @since 2.0.0
 * @category mapping
 */
export const as: {
  <Out2>(out: Out2): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out2, In, R>
  <Out, In, R, Out2>(self: Schedule<Out, In, R>, out: Out2): Schedule<Out2, In, R>
} = internal.as

/**
 * Returns a new schedule that maps the output of this schedule to unit.
 *
 * @since 2.0.0
 * @category constructors
 */
export const asVoid: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<void, In, R> = internal.asVoid

/**
 * Returns a new schedule that has both the inputs and outputs of this and the
 * specified schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const bothInOut: {
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<[Out, Out2], readonly [In, In2], R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>
  ): Schedule<[Out, Out2], readonly [In, In2], R | R2>
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
  <In, Out>(test: (input: In, output: Out) => boolean): <R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, test: (input: In, output: Out) => boolean): Schedule<Out, In, R>
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
  <In, Out, R2>(
    test: (input: In, output: Out) => Effect.Effect<boolean, never, R2>
  ): <R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, R2>(
    self: Schedule<Out, In, R>,
    test: (input: In, output: Out) => Effect.Effect<boolean, never, R2>
  ): Schedule<Out, In, R | R2>
} = internal.checkEffect

/**
 * A schedule that recurs anywhere, collecting all inputs into a `Chunk`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAllInputs: <A>() => Schedule<Chunk.Chunk<A>, A> = internal.collectAllInputs

/**
 * Returns a new schedule that collects the outputs of this one into a chunk.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectAllOutputs: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Chunk.Chunk<Out>, In, R> =
  internal.collectAllOutputs

/**
 * A schedule that recurs until the condition f fails, collecting all inputs
 * into a list.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectUntil: <A>(f: Predicate<A>) => Schedule<Chunk.Chunk<A>, A> = internal.collectUntil

/**
 * A schedule that recurs until the effectful condition f fails, collecting
 * all inputs into a list.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectUntilEffect: <A, R>(
  f: (a: A) => Effect.Effect<boolean, never, R>
) => Schedule<Chunk.Chunk<A>, A, R> = internal.collectUntilEffect

/**
 * A schedule that recurs as long as the condition f holds, collecting all
 * inputs into a list.
 *
 * @since 2.0.0
 * @category utils
 */
export const collectWhile: <A>(f: Predicate<A>) => Schedule<Chunk.Chunk<A>, A> = internal.collectWhile

/**
 * A schedule that recurs as long as the effectful condition holds, collecting
 * all inputs into a list.
 *
 * @category utils
 * @since 2.0.0
 */
export const collectWhileEffect: <A, R>(
  f: (a: A) => Effect.Effect<boolean, never, R>
) => Schedule<Chunk.Chunk<A>, A, R> = internal.collectWhileEffect

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
  <Out2, Out, R2>(that: Schedule<Out2, Out, R2>): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out2, In, R2 | R>
  <Out, In, R, Out2, R2>(self: Schedule<Out, In, R>, that: Schedule<Out2, Out, R2>): Schedule<Out2, In, R | R2>
} = internal.compose

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapInput: {
  <In, In2>(f: (in2: In2) => In): <Out, R>(self: Schedule<Out, In, R>) => Schedule<Out, In2, R>
  <Out, In, R, In2>(self: Schedule<Out, In, R>, f: (in2: In2) => In): Schedule<Out, In2, R>
} = internal.mapInput

/**
 * Transforms the context being provided to this schedule with the
 * specified function.
 *
 * @since 2.0.0
 * @category context
 */
export const mapInputContext: {
  <R0, R>(
    f: (env0: Context.Context<R0>) => Context.Context<R>
  ): <Out, In>(self: Schedule<Out, In, R>) => Schedule<Out, In, R0>
  <Out, In, R, R0>(
    self: Schedule<Out, In, R>,
    f: (env0: Context.Context<R0>) => Context.Context<R>
  ): Schedule<Out, In, R0>
} = internal.mapInputContext

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapInputEffect: {
  <In2, In, R2>(
    f: (in2: In2) => Effect.Effect<In, never, R2>
  ): <Out, R>(self: Schedule<Out, In, R>) => Schedule<Out, In2, R2 | R>
  <Out, In, R, In2, R2>(
    self: Schedule<Out, In, R>,
    f: (in2: In2) => Effect.Effect<In, never, R2>
  ): Schedule<Out, In2, R | R2>
} = internal.mapInputEffect

/**
 * A schedule that always recurs, which counts the number of recurrences.
 *
 * @since 2.0.0
 * @category constructors
 */
export const count: Schedule<number> = internal.count

/**
 * Cron schedule that recurs every `minute` that matches the schedule.
 *
 * It triggers at zero second of the minute. Producing the timestamps of the cron window.
 *
 * NOTE: `expression` parameter is validated lazily. Must be a valid cron expression.
 *
 * @since 2.0.0
 * @category constructors
 */
export const cron: (expression: string | Cron.Cron) => Schedule<[number, number]> = internal.cron

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
export const dayOfMonth: (day: number) => Schedule<number> = internal.dayOfMonth

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
export const dayOfWeek: (day: number) => Schedule<number> = internal.dayOfWeek

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
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(
    self: Schedule<Out, In, R>,
    f: (duration: Duration.Duration) => Duration.DurationInput
  ): Schedule<Out, In, R>
} = internal.delayed

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @since 2.0.0
 * @category constructors
 */
export const delayedEffect: {
  <R2>(
    f: (duration: Duration.Duration) => Effect.Effect<Duration.DurationInput, never, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, R2>(
    self: Schedule<Out, In, R>,
    f: (duration: Duration.Duration) => Effect.Effect<Duration.DurationInput, never, R2>
  ): Schedule<Out, In, R | R2>
} = internal.delayedEffect

/**
 * Takes a schedule that produces a delay, and returns a new schedule that
 * uses this delay to further delay intervals in the resulting schedule.
 *
 * @since 2.0.0
 * @category constructors
 */
export const delayedSchedule: <In, R>(
  schedule: Schedule<Duration.Duration, In, R>
) => Schedule<Duration.Duration, In, R> = internal.delayedSchedule

/**
 * Returns a new schedule that outputs the delay between each occurence.
 *
 * @since 2.0.0
 * @category constructors
 */
export const delays: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Duration.Duration, In, R> = internal.delays

/**
 * Returns a new schedule that maps both the input and output.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapBoth: {
  <In2, In, Out, Out2>(
    options: { readonly onInput: (in2: In2) => In; readonly onOutput: (out: Out) => Out2 }
  ): <R>(self: Schedule<Out, In, R>) => Schedule<Out2, In2, R>
  <Out, In, R, In2, Out2>(
    self: Schedule<Out, In, R>,
    options: { readonly onInput: (in2: In2) => In; readonly onOutput: (out: Out) => Out2 }
  ): Schedule<Out2, In2, R>
} = internal.mapBoth

/**
 * Returns a new schedule that maps both the input and output.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapBothEffect: {
  <In2, In, R2, Out, R3, Out2>(
    options: {
      readonly onInput: (input: In2) => Effect.Effect<In, never, R2>
      readonly onOutput: (out: Out) => Effect.Effect<Out2, never, R3>
    }
  ): <R>(self: Schedule<Out, In, R>) => Schedule<Out2, In2, R2 | R3 | R>
  <Out, In, R, In2, R2, Out2, R3>(
    self: Schedule<Out, In, R>,
    options: {
      readonly onInput: (input: In2) => Effect.Effect<In, never, R2>
      readonly onOutput: (out: Out) => Effect.Effect<Out2, never, R3>
    }
  ): Schedule<Out2, In2, R | R2 | R3>
} = internal.mapBothEffect

/**
 * Returns a driver that can be used to step the schedule, appropriately
 * handling sleeping.
 *
 * @since 2.0.0
 * @category getter
 */
export const driver: <Out, In, R>(
  self: Schedule<Out, In, R>
) => Effect.Effect<ScheduleDriver<Out, In, R>> = internal.driver

/**
 * A schedule that can recur one time, the specified amount of time into the
 * future.
 *
 * @since 2.0.0
 * @category constructors
 */
export const duration: (duration: Duration.DurationInput) => Schedule<Duration.Duration> = internal.duration

/**
 * Returns a new schedule that performs a geometric union on the intervals
 * defined by both schedules.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const either: {
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<[Out, Out2], In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>
  ): Schedule<[Out, Out2], In & In2, R | R2>
} = internal.either

/**
 * The same as `either` followed by `map`.
 *
 * @since 2.0.0
 * @category alternatives
 */
export const eitherWith: {
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<[Out, Out2], In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): Schedule<[Out, Out2], In & In2, R | R2>
} = internal.eitherWith

/**
 * A schedule that occurs everywhere, which returns the total elapsed duration
 * since the first step.
 *
 * @since 2.0.0
 * @category constructors
 */
export const elapsed: Schedule<Duration.Duration> = internal.elapsed

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
  <X>(finalizer: Effect.Effect<X, never, never>): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R, X>(self: Schedule<Out, In, R>, finalizer: Effect.Effect<X, never, never>): Schedule<Out, In, R>
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
) => Schedule<Duration.Duration> = internal.exponential

/**
 * A schedule that always recurs, increasing delays by summing the preceding
 * two delays (similar to the fibonacci sequence). Returns the current
 * duration between recurrences.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fibonacci: (one: Duration.DurationInput) => Schedule<Duration.Duration> = internal.fibonacci

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
export const fixed: (interval: Duration.DurationInput) => Schedule<number> = internal.fixed

/**
 * A schedule that always recurs, producing a count of repeats: 0, 1, 2.
 *
 * @since 2.0.0
 * @category constructors
 */
export const forever: Schedule<number> = internal.forever

/**
 * A schedule that recurs once with the specified delay.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromDelay: (delay: Duration.DurationInput) => Schedule<Duration.Duration> = internal.fromDelay

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
) => Schedule<Duration.Duration> = internal.fromDelays

/**
 * A schedule that always recurs, mapping input values through the specified
 * function.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromFunction: <A, B>(f: (a: A) => B) => Schedule<B, A> = internal.fromFunction

/**
 * Cron-like schedule that recurs every specified `hour` of each day. It
 * triggers at zero minute of the hour. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `hour` parameter is validated lazily. Must be in range 0...23.
 *
 * @since 2.0.0
 * @category constructors
 */
export const hourOfDay: (hour: number) => Schedule<number> = internal.hourOfDay

/**
 * A schedule that always recurs, which returns inputs as outputs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const identity: <A>() => Schedule<A, A> = internal.identity

/**
 * Returns a new schedule that performs a geometric intersection on the
 * intervals defined by both schedules.
 *
 * @since 2.0.0
 * @category utils
 */
export const intersect: {
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<[Out, Out2], In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>
  ): Schedule<[Out, Out2], In & In2, R | R2>
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
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<[Out, Out2], In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): Schedule<[Out, Out2], In & In2, R | R2>
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
export const jittered: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R> = internal.jittered

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
  (
    options: { min?: number | undefined; max?: number | undefined }
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(
    self: Schedule<Out, In, R>,
    options: { min?: number | undefined; max?: number | undefined }
  ): Schedule<Out, In, R>
} = internal.jitteredWith

/**
 * A schedule that always recurs, but will repeat on a linear time interval,
 * given by `base * n` where `n` is the number of repetitions so far. Returns
 * the current duration between recurrences.
 *
 * @since 2.0.0
 * @category constructors
 */
export const linear: (base: Duration.DurationInput) => Schedule<Duration.Duration> = internal.linear

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <Out, Out2>(f: (out: Out) => Out2): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out2, In, R>
  <Out, In, R, Out2>(self: Schedule<Out, In, R>, f: (out: Out) => Out2): Schedule<Out2, In, R>
} = internal.map

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified effectful function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const mapEffect: {
  <Out, Out2, R2>(
    f: (out: Out) => Effect.Effect<Out2, never, R2>
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out2, In, R2 | R>
  <Out, In, R, Out2, R2>(
    self: Schedule<Out, In, R>,
    f: (out: Out) => Effect.Effect<Out2, never, R2>
  ): Schedule<Out2, In, R | R2>
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
export const minuteOfHour: (minute: number) => Schedule<number> = internal.minuteOfHour

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
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(
    self: Schedule<Out, In, R>,
    f: (out: Out, duration: Duration.Duration) => Duration.DurationInput
  ): Schedule<Out, In, R>
} = internal.modifyDelay

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 *
 * @since 2.0.0
 * @category utils
 */
export const modifyDelayEffect: {
  <Out, R2>(
    f: (out: Out, duration: Duration.Duration) => Effect.Effect<Duration.DurationInput, never, R2>
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, R2>(
    self: Schedule<Out, In, R>,
    f: (out: Out, duration: Duration.Duration) => Effect.Effect<Duration.DurationInput, never, R2>
  ): Schedule<Out, In, R | R2>
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
  <Out, X, R2>(
    f: (out: Out, decision: ScheduleDecision.ScheduleDecision) => Effect.Effect<X, never, R2>
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, X, R2>(
    self: Schedule<Out, In, R>,
    f: (out: Out, decision: ScheduleDecision.ScheduleDecision) => Effect.Effect<X, never, R2>
  ): Schedule<Out, In, R | R2>
} = internal.onDecision

/**
 * A schedule that recurs one time.
 *
 * @since 2.0.0
 * @category constructors
 */
export const once: Schedule<void> = internal.once

/**
 * Returns a new schedule that passes through the inputs of this schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const passthrough: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<In, In, R> = internal.passthrough

/**
 * Returns a new schedule with its context provided to it, so the
 * resulting schedule does not require any context.
 *
 * @since 2.0.0
 * @category context
 */
export const provideContext: {
  <R>(context: Context.Context<R>): <Out, In>(self: Schedule<Out, In, R>) => Schedule<Out, In, never>
  <Out, In, R>(self: Schedule<Out, In, R>, context: Context.Context<R>): Schedule<Out, In, never>
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
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, Exclude<R, Context.Tag.Identifier<T>>>
  <Out, In, R, T extends Context.Tag<any, any>>(
    self: Schedule<Out, In, R>,
    tag: T,
    service: Context.Tag.Service<T>
  ): Schedule<Out, In, Exclude<R, Context.Tag.Identifier<T>>>
} = internal.provideService

/**
 * A schedule that recurs for until the predicate evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurUntil: <A>(f: Predicate<A>) => Schedule<A, A> = internal.recurUntil

/**
 * A schedule that recurs for until the predicate evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurUntilEffect: <A, R>(f: (a: A) => Effect.Effect<boolean, never, R>) => Schedule<A, A, R> =
  internal.recurUntilEffect

/**
 * A schedule that recurs for until the input value becomes applicable to
 * partial function and then map that value with given function.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurUntilOption: <A, B>(pf: (a: A) => Option.Option<B>) => Schedule<Option.Option<B>, A> =
  internal.recurUntilOption

/**
 * A schedule that recurs during the given duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurUpTo: (duration: Duration.DurationInput) => Schedule<Duration.Duration> = internal.recurUpTo

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurWhile: <A>(f: Predicate<A>) => Schedule<A, A> = internal.recurWhile

/**
 * A schedule that recurs for as long as the effectful predicate evaluates to
 * true.
 *
 * @since 2.0.0
 * @category utils
 */
export const recurWhileEffect: <A, R>(f: (a: A) => Effect.Effect<boolean, never, R>) => Schedule<A, A, R> =
  internal.recurWhileEffect

/**
 * A schedule spanning all time, which can be stepped only the specified
 * number of times before it terminates.
 *
 * @category constructors
 * @since 2.0.0
 */
export const recurs: (n: number) => Schedule<number> = internal.recurs

/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduce: {
  <Out, Z>(zero: Z, f: (z: Z, out: Out) => Z): <In, R>(self: Schedule<Out, In, R>) => Schedule<Z, In, R>
  <Out, In, R, Z>(self: Schedule<Out, In, R>, zero: Z, f: (z: Z, out: Out) => Z): Schedule<Z, In, R>
} = internal.reduce

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 *
 * @since 2.0.0
 * @category folding
 */
export const reduceEffect: {
  <Z, Out, R2>(
    zero: Z,
    f: (z: Z, out: Out) => Effect.Effect<Z, never, R2>
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Z, In, R2 | R>
  <Out, In, R, Z, R2>(
    self: Schedule<Out, In, R>,
    zero: Z,
    f: (z: Z, out: Out) => Effect.Effect<Z, never, R2>
  ): Schedule<Z, In, R | R2>
} = internal.reduceEffect

/**
 * Returns a new schedule that loops this one continuously, resetting the
 * state when this schedule is done.
 *
 * @since 2.0.0
 * @category constructors
 */
export const repeatForever: Schedule<number> = internal.forever

/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 *
 * @since 2.0.0
 * @category utils
 */
export const repetitions: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<number, In, R> = internal.repetitions

/**
 * Return a new schedule that automatically resets the schedule to its initial
 * state after some time of inactivity defined by `duration`.
 *
 * @since 2.0.0
 * @category utils
 */
export const resetAfter: {
  (duration: Duration.DurationInput): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, duration: Duration.DurationInput): Schedule<Out, In, R>
} = internal.resetAfter

/**
 * Resets the schedule when the specified predicate on the schedule output
 * evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const resetWhen: {
  <Out>(f: Predicate<Out>): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<Out>): Schedule<Out, In, R>
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
  ): <Out, R>(self: Schedule<Out, In, R>) => Effect.Effect<Chunk.Chunk<Out>, never, R>
  <Out, In, R>(self: Schedule<Out, In, R>, now: number, input: Iterable<In>): Effect.Effect<Chunk.Chunk<Out>, never, R>
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
export const secondOfMinute: (second: number) => Schedule<number> = internal.secondOfMinute

/**
 * Returns a schedule that recurs continuously, each repetition spaced the
 * specified duration from the last run.
 *
 * @since 2.0.0
 * @category constructors
 */
export const spaced: (duration: Duration.DurationInput) => Schedule<number> = internal.spaced

/**
 * A schedule that does not recur, it just stops.
 *
 * @since 2.0.0
 * @category constructors
 */
export const stop: Schedule<void> = internal.stop

/**
 * Returns a schedule that repeats one time, producing the specified constant
 * value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Schedule<A> = internal.succeed

/**
 * Returns a schedule that repeats one time, producing the specified constant
 * value.
 *
 * @category constructors
 * @since 2.0.0
 */
export const sync: <A>(evaluate: LazyArg<A>) => Schedule<A> = internal.sync

/**
 * Returns a new schedule that effectfully processes every input to this
 * schedule.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapInput: {
  <In2, X, R2>(
    f: (input: In2) => Effect.Effect<X, never, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In & In2, R2 | R>
  <Out, In, R, In2, X, R2>(
    self: Schedule<Out, In, R>,
    f: (input: In2) => Effect.Effect<X, never, R2>
  ): Schedule<Out, In & In2, R | R2>
} = internal.tapInput

/**
 * Returns a new schedule that effectfully processes every output from this
 * schedule.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const tapOutput: {
  <XO extends Out, X, R2, Out>(
    f: (out: XO) => Effect.Effect<X, never, R2>
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, XO extends Out, X, R2>(
    self: Schedule<Out, In, R>,
    f: (out: XO) => Effect.Effect<X, never, R2>
  ): Schedule<Out, In, R | R2>
} = internal.tapOutput

/**
 * Unfolds a schedule that repeats one time from the specified state and
 * iterator.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unfold: <A>(initial: A, f: (a: A) => A) => Schedule<A> = internal.unfold

/**
 * Returns a new schedule that performs a geometric union on the intervals
 * defined by both schedules.
 *
 * @since 2.0.0
 * @category utils
 */
export const union: {
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<[Out, Out2], In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>
  ): Schedule<[Out, Out2], In & In2, R | R2>
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
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<[Out, Out2], In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ): Schedule<[Out, Out2], In & In2, R | R2>
} = internal.unionWith

/**
 * Returns a new schedule that continues until the specified predicate on the
 * input evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const untilInput: {
  <In>(f: Predicate<In>): <Out, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<In>): Schedule<Out, In, R>
} = internal.untilInput

/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the input evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const untilInputEffect: {
  <In, R2>(
    f: (input: In) => Effect.Effect<boolean, never, R2>
  ): <Out, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, R2>(
    self: Schedule<Out, In, R>,
    f: (input: In) => Effect.Effect<boolean, never, R2>
  ): Schedule<Out, In, R | R2>
} = internal.untilInputEffect

/**
 * Returns a new schedule that continues until the specified predicate on the
 * output evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const untilOutput: {
  <Out>(f: Predicate<Out>): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<Out>): Schedule<Out, In, R>
} = internal.untilOutput

/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the output evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const untilOutputEffect: {
  <Out, R2>(
    f: (out: Out) => Effect.Effect<boolean, never, R2>
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, R2>(
    self: Schedule<Out, In, R>,
    f: (out: Out) => Effect.Effect<boolean, never, R2>
  ): Schedule<Out, In, R | R2>
} = internal.untilOutputEffect

/**
 * A schedule that recurs during the given duration.
 *
 * @since 2.0.0
 * @category utils
 */
export const upTo: {
  (duration: Duration.DurationInput): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, duration: Duration.DurationInput): Schedule<Out, In, R>
} = internal.upTo

/**
 * Returns a new schedule that continues for as long as the specified predicate
 * on the input evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const whileInput: {
  <In>(f: Predicate<In>): <Out, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<In>): Schedule<Out, In, R>
} = internal.whileInput

/**
 * Returns a new schedule that continues for as long as the specified effectful
 * predicate on the input evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const whileInputEffect: {
  <In, R2>(
    f: (input: In) => Effect.Effect<boolean, never, R2>
  ): <Out, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, R2>(
    self: Schedule<Out, In, R>,
    f: (input: In) => Effect.Effect<boolean, never, R2>
  ): Schedule<Out, In, R | R2>
} = internal.whileInputEffect

/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the output evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const whileOutput: {
  <Out>(f: Predicate<Out>): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<Out>): Schedule<Out, In, R>
} = internal.whileOutput

/**
 * Returns a new schedule that continues for as long the specified effectful
 * predicate on the output evaluates to true.
 *
 * @since 2.0.0
 * @category utils
 */
export const whileOutputEffect: {
  <Out, R2>(
    f: (out: Out) => Effect.Effect<boolean, never, R2>
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, R2>(
    self: Schedule<Out, In, R>,
    f: (out: Out) => Effect.Effect<boolean, never, R2>
  ): Schedule<Out, In, R | R2>
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
export const windowed: (interval: Duration.DurationInput) => Schedule<number> = internal.windowed

/**
 * The same as `intersect` but ignores the right output.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipLeft: {
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>
  ): Schedule<Out, In & In2, R | R2>
} = internal.zipLeft

/**
 * The same as `intersect` but ignores the left output.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipRight: {
  <Out2, In2, R2>(
    that: Schedule<Out2, In2, R2>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out2, In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>
  ): Schedule<Out2, In & In2, R | R2>
} = internal.zipRight

/**
 * Equivalent to `intersect` followed by `map`.
 *
 * @since 2.0.0
 * @category zipping
 */
export const zipWith: {
  <Out2, In2, R2, Out, Out3>(
    that: Schedule<Out2, In2, R2>,
    f: (out: Out, out2: Out2) => Out3
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out3, In & In2, R2 | R>
  <Out, In, R, Out2, In2, R2, Out3>(
    self: Schedule<Out, In, R>,
    that: Schedule<Out2, In2, R2>,
    f: (out: Out, out2: Out2) => Out3
  ): Schedule<Out3, In & In2, R | R2>
} = internal.zipWith

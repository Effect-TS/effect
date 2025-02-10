/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Chunk from "./Chunk.js"
import type * as Context from "./Context.js"
import type * as Cron from "./Cron.js"
import type * as DateTime from "./DateTime.js"
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
 * @category Symbols
 */
export const ScheduleTypeId: unique symbol = internal.ScheduleTypeId

/**
 * @since 2.0.0
 * @category Symbols
 */
export type ScheduleTypeId = typeof ScheduleTypeId

/**
 * @since 2.0.0
 * @category Symbols
 */
export const ScheduleDriverTypeId: unique symbol = internal.ScheduleDriverTypeId

/**
 * @since 2.0.0
 * @category Symbols
 */
export type ScheduleDriverTypeId = typeof ScheduleDriverTypeId

/**
 * A `Schedule<Out, In, R>` defines a recurring schedule, which consumes values
 * of type `In`, and which returns values of type `Out`.
 *
 * The `Schedule` type is structured as follows:
 *
 * ```text
 *           ┌─── The type of output produced by the schedule
 *           │   ┌─── The type of input consumed by the schedule
 *           │   │     ┌─── Additional requirements for the schedule
 *           ▼   ▼     ▼
 * Schedule<Out, In, Requirements>
 * ```
 *
 * A schedule operates by consuming values of type `In` (such as errors in the
 * case of `Effect.retry`, or values in the case of `Effect.repeat`) and
 * producing values of type `Out`. It determines when to halt or continue the
 * execution based on input values and its internal state.
 *
 * The inclusion of a `Requirements` parameter allows the schedule to leverage
 * additional services or resources as needed.
 *
 * Schedules are defined as a possibly infinite set of intervals spread out over
 * time. Each interval defines a window in which recurrence is possible.
 *
 * When schedules are used to repeat or retry effects, the starting boundary of
 * each interval produced by a schedule is used as the moment when the effect
 * will be executed again.
 *
 * Schedules can be composed in different ways:
 *
 * - Union: Combines two schedules and recurs if either schedule wants to
 *   continue, using the shorter delay.
 * - Intersection: Combines two schedules and recurs only if both schedules want
 *   to continue, using the longer delay.
 * - Sequencing: Combines two schedules by running the first one fully, then
 *   switching to the second.
 *
 * In addition, schedule inputs and outputs can be transformed, filtered (to
 * terminate a schedule early in response to some input or output), and so
 * forth.
 *
 * A variety of other operators exist for transforming and combining schedules,
 * and the companion object for `Schedule` contains all common types of
 * schedules, both for performing retrying, as well as performing repetition.
 *
 * @category Model
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
   * @category Models
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
 * @category Models
 */
export interface ScheduleDriver<out Out, in In = unknown, out R = never> extends Schedule.DriverVariance<Out, In, R> {
  readonly state: Effect.Effect<unknown>
  readonly last: Effect.Effect<Out, Cause.NoSuchElementException>
  readonly reset: Effect.Effect<void>
  next(input: In): Effect.Effect<Out, Option.Option<never>, R>
}

/**
 * Creates a new schedule with a custom state and step function.
 *
 * **Details**
 *
 * This function constructs a `Schedule` by defining its **initial state** and
 * a **step function**, which determines how the schedule progresses over time.
 * The step function is called on each iteration with the current time, an input
 * value,
 * and the schedule's current state. It returns the next state, an output value,
 * and a decision on whether the schedule should continue or stop.
 *
 * This function is useful for creating **custom scheduling logic** that goes
 * beyond
 * predefined schedules like fixed intervals or exponential backoff. It allows
 * full control over how the schedule behaves at each step.
 *
 * @since 2.0.0
 * @category Constructors
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
 * Checks whether a given value is a `Schedule`.
 *
 * @since 2.0.0
 * @category Guards
 */
export const isSchedule: (u: unknown) => u is Schedule<unknown, never, unknown> = internal.isSchedule

/**
 * Adds a delay to every interval in a schedule.
 *
 * **Details**
 *
 * This function modifies a given schedule by applying an additional delay to
 * every interval it defines. The delay is determined by the provided function,
 * which takes the schedule's output and returns a delay duration.
 *
 * @see {@link addDelayEffect} If you need to compute the delay using an effectful function.
 *
 * @since 2.0.0
 * @category Timing & Delay
 */
export const addDelay: {
  <Out>(f: (out: Out) => Duration.DurationInput): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: (out: Out) => Duration.DurationInput): Schedule<Out, In, R>
} = internal.addDelay

/**
 * Adds an effectfully computed delay to every interval in a schedule.
 *
 * **Details**
 *
 * This function modifies a given schedule by applying an additional delay to
 * each interval, where the delay is determined by an **effectful function**.
 * The function takes the schedule’s output and returns an effect that produces
 * a delay duration.
 *
 * @see {@link addDelay} If you need to compute the delay using a pure function.
 *
 * @since 2.0.0
 * @category Timing & Delay
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
 * Runs two schedules sequentially, merging their outputs.
 *
 * **Details**
 *
 * This function executes two schedules **one after the other**. The first
 * schedule runs to completion, and then the second schedule begins execution.
 * Unlike {@link andThenEither}, this function **merges** the outputs instead of
 * wrapping them in `Either`, allowing both schedules to contribute their
 * results directly.
 *
 * This is useful when a workflow consists of **two phases** where the second
 * phase should start only after the first one has fully completed.
 *
 * @see {@link andThenEither} If you need to keep track of which schedule produced each result.
 *
 * @since 2.0.0
 * @category Sequential Composition
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
 * Runs two schedules sequentially, collecting results in an `Either`.
 *
 * **Details**
 *
 * This function combines two schedules in sequence. The first schedule runs to
 * completion, and then the second schedule starts and runs to completion as
 * well. The outputs of both schedules are collected into an `Either` structure:
 * - **Left (`Either.Left`)** contains the output of the second schedule.
 * - **Right (`Either.Right`)** contains the output of the first schedule.
 *
 * This is useful when you need to **switch** from one schedule to another after
 * the first one finishes, while still keeping track of which schedule produced
 * each result.
 *
 * @see {@link andThen} If you need to merge the outputs of both schedules.
 *
 * @since 2.0.0
 * @category Sequential Composition
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
 * Transforms a schedule to always produce a constant output.
 *
 * **Details**
 *
 * This function modifies a given schedule so that instead of returning its
 * computed outputs, it always returns a **constant value**.
 *
 * This is useful when you need a schedule for timing but don’t care about its
 * actual output, or when you want to standardize results across different
 * scheduling strategies.
 *
 * @since 2.0.0
 * @category Mapping
 */
export const as: {
  <Out2>(out: Out2): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out2, In, R>
  <Out, In, R, Out2>(self: Schedule<Out, In, R>, out: Out2): Schedule<Out2, In, R>
} = internal.as

/**
 * Transforms a schedule to always return `void` instead of its output.
 *
 * **Details**
 *
 * This function modifies a given schedule so that it no longer returns
 * meaningful output—each execution produces `void`. This is useful when the
 * schedule is used **only for timing purposes** and the actual output of the
 * schedule is irrelevant.
 *
 * The schedule still determines when executions should occur, but the results
 * are discarded.
 *
 * @since 2.0.0
 * @category Mapping
 */
export const asVoid: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<void, In, R> = internal.asVoid

// TODO(4.0): rename to `zip`?
/**
 * Combines two schedules, preserving both their inputs and outputs.
 *
 * **Details**
 *
 * This function merges two schedules so that both their **input types** and
 * **output types** are retained. When executed, the resulting schedule will
 * take inputs from both original schedules and produce a tuple containing both
 * outputs.
 *
 * It recurs if either schedule wants to continue, using the shorter delay.
 *
 * This is useful when you want to **track multiple schedules simultaneously**,
 * ensuring that both receive the same inputs and produce combined results.
 *
 * @since 2.0.0
 * @category Zipping
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
 * Filters schedule executions based on a custom condition.
 *
 * **Details**
 *
 * This function modifies a schedule by applying a **custom test function** to
 * each input-output pair. The test function determines whether the schedule
 * should continue or stop. If the function returns `true`, the schedule
 * proceeds as usual; if it returns `false`, the schedule terminates.
 *
 * This is useful for **conditional retries**, **custom stop conditions**, or
 * **dynamically controlling execution** based on observed inputs and outputs.
 *
 * @see {@link checkEffect} If you need to use an effectful test function.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const check: {
  <In, Out>(test: (input: In, output: Out) => boolean): <R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, test: (input: In, output: Out) => boolean): Schedule<Out, In, R>
} = internal.check

/**
 * Conditionally filters schedule executions using an effectful function.
 *
 * **Details**
 *
 * This function modifies a schedule by applying a **custom effectful test
 * function** to each input-output pair. The test function runs asynchronously
 * and determines whether the schedule should continue (`true`) or stop
 * (`false`).
 *
 * This is useful when the decision to continue depends on **external factors**
 * such as database lookups, API calls, or other asynchronous computations.
 *
 * @see {@link check} If you need to use a pure test function.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
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
 * A schedule that collects all inputs into a `Chunk`.
 *
 * **Details**
 *
 * This function creates a schedule that **never terminates** and continuously
 * collects every input it receives into a `Chunk`. Each time the schedule runs,
 * it appends the new input to the collected list.
 *
 * This is useful when you need to **track all received inputs** over time, such
 * as logging user actions, recording retry attempts, or accumulating data for
 * later processing.
 *
 * @see {@link collectAllOutputs} If you need to collect outputs instead of
 * inputs.
 *
 * @since 2.0.0
 * @category Collecting
 */
export const collectAllInputs: <A>() => Schedule<Chunk.Chunk<A>, A> = internal.collectAllInputs

/**
 * Collects all outputs of a schedule into a `Chunk`.
 *
 * **Details**
 *
 * This function modifies a given schedule so that instead of returning
 * individual outputs, it accumulates them into a `Chunk`. The schedule
 * continues to run, appending each output to the collected list.
 *
 * This is useful when you need to **track all results** over time, such as
 * logging outputs, aggregating data, or keeping a history of previous values.
 *
 * @see {@link collectAllInputs} If you need to collect inputs instead of
 * outputs.
 *
 * @since 2.0.0
 * @category Collecting
 */
export const collectAllOutputs: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Chunk.Chunk<Out>, In, R> =
  internal.collectAllOutputs

/**
 * Collects all inputs into a `Chunk` until a condition fails.
 *
 * **Details**
 *
 * This function creates a schedule that continuously collects inputs into a
 * `Chunk` **until** the given predicate function `f` evaluates to `false`. Once
 * the condition fails, the schedule stops.
 *
 * @since 2.0.0
 * @category Collecting
 */
export const collectUntil: <A>(f: Predicate<A>) => Schedule<Chunk.Chunk<A>, A> = internal.collectUntil

/**
 * Collects all inputs into a `Chunk` until an effectful condition fails.
 *
 * **Details**
 *
 * This function creates a schedule that continuously collects inputs into a
 * `Chunk` **until** the given effectful predicate `f` returns `false`. The
 * predicate runs as an effect, meaning it can involve asynchronous computations
 * like API calls, database lookups, or randomness.
 *
 * @since 2.0.0
 * @category Collecting
 */
export const collectUntilEffect: <A, R>(
  f: (a: A) => Effect.Effect<boolean, never, R>
) => Schedule<Chunk.Chunk<A>, A, R> = internal.collectUntilEffect

/**
 * Collects all inputs into a `Chunk` while a condition holds.
 *
 * **Details**
 *
 * This function creates a schedule that continuously collects inputs into a
 * `Chunk` **while** the given predicate function `f` evaluates to `true`. As
 * soon as the condition fails, the schedule stops.
 *
 * @since 2.0.0
 * @category Collecting
 */
export const collectWhile: <A>(f: Predicate<A>) => Schedule<Chunk.Chunk<A>, A> = internal.collectWhile

/**
 * Collects all inputs into a `Chunk` while an effectful condition holds.
 *
 * **Details**
 *
 * This function creates a schedule that continuously collects inputs into a
 * `Chunk` **while** the given effectful predicate `f` returns `true`. The
 * predicate returns an effect, meaning it can depend on external state, such as
 * database queries, API responses, or real-time user conditions.
 *
 * As soon as the effectful condition returns `false`, the schedule stops. This
 * is useful for **dynamically controlled data collection**, where stopping
 * depends on an **external or asynchronous factor**.
 *
 * @since 2.0.0
 * @category Collecting
 */
export const collectWhileEffect: <A, R>(
  f: (a: A) => Effect.Effect<boolean, never, R>
) => Schedule<Chunk.Chunk<A>, A, R> = internal.collectWhileEffect

/**
 * Chains two schedules, passing the output of the first as the input to the
 * second, while selecting the shorter delay between them.
 *
 * **Details**
 *
 * This function composes two schedules so that the **output** of the first
 * schedule becomes the **input** of the second schedule. The first schedule
 * executes first, and once it produces a result, the second schedule receives
 * that result and continues execution based on it.
 *
 * This is useful for **building complex scheduling workflows** where one
 * schedule's behavior determines how the next schedule behaves.
 *
 * @since 2.0.0
 * @category Composition
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
 * @category Mapping
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
 * @category Mapping
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
 * @category Mapping
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
 * @category Constructors
 */
export const count: Schedule<number> = internal.count

/**
 * Cron schedule that recurs every interval that matches the schedule.
 *
 * It triggers at the beginning of each cron interval, producing the timestamps of the cron window.
 *
 * NOTE: `expression` parameter is validated lazily. Must be a valid cron expression.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const cron: {
  (cron: Cron.Cron): Schedule<[number, number]>
  (expression: string, tz?: DateTime.TimeZone | string): Schedule<[number, number]>
} = internal.cron

/**
 * Cron-like schedule that recurs every specified `day` of month. Won't recur
 * on months containing less days than specified in `day` param.
 *
 * It triggers at zero hour of the day. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `day` parameter is validated lazily. Must be in range 1...31.
 *
 * @since 2.0.0
 * @category Constructors
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
 * @category Constructors
 */
export const dayOfWeek: (day: number) => Schedule<number> = internal.dayOfWeek

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @since 2.0.0
 * @category Timing & Delay
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
 * @category Timing & Delay
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
 * @category Timing & Delay
 */
export const delayedSchedule: <In, R>(
  schedule: Schedule<Duration.Duration, In, R>
) => Schedule<Duration.Duration, In, R> = internal.delayedSchedule

/**
 * Returns a new schedule that outputs the delay between each occurence.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const delays: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Duration.Duration, In, R> = internal.delays

/**
 * Returns a new schedule that maps both the input and output.
 *
 * @since 2.0.0
 * @category Mapping
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
 * @category Mapping
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
 * @category Constructors
 */
export const duration: (duration: Duration.DurationInput) => Schedule<Duration.Duration> = internal.duration

/**
 * Returns a new schedule that performs a geometric union on the intervals
 * defined by both schedules.
 *
 * @since 2.0.0
 * @category Alternatives
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
 * @category Alternatives
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
 * @category Constructors
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
 * @category Finalization
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
 * @category Constructors
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
 * @category Constructors
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
 * @category Constructors
 */
export const fixed: (interval: Duration.DurationInput) => Schedule<number> = internal.fixed

/**
 * A schedule that always recurs, producing a count of repeats: 0, 1, 2.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const forever: Schedule<number> = internal.forever

/**
 * A schedule that recurs once with the specified delay.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const fromDelay: (delay: Duration.DurationInput) => Schedule<Duration.Duration> = internal.fromDelay

/**
 * A schedule that recurs once for each of the specified durations, delaying
 * each time for the length of the specified duration. Returns the length of
 * the current duration between recurrences.
 *
 * @since 2.0.0
 * @category Constructors
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
 * @category Constructors
 */
export const fromFunction: <A, B>(f: (a: A) => B) => Schedule<B, A> = internal.fromFunction

/**
 * Cron-like schedule that recurs every specified `hour` of each day. It
 * triggers at zero minute of the hour. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `hour` parameter is validated lazily. Must be in range 0...23.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const hourOfDay: (hour: number) => Schedule<number> = internal.hourOfDay

/**
 * A schedule that always recurs, which returns inputs as outputs.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const identity: <A>() => Schedule<A, A> = internal.identity

/**
 * Combines two schedules and recurs only if both schedules want to continue,
 * using the longer delay.
 *
 * @since 2.0.0
 * @category Composition
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
 * @category Composition
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
 * @category Timing & Delay
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
 * @category Timing & Delay
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
 * @category Constructors
 */
export const linear: (base: Duration.DurationInput) => Schedule<Duration.Duration> = internal.linear

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified function.
 *
 * @since 2.0.0
 * @category Mapping
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
 * @category Mapping
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
 * @category Constructors
 */
export const minuteOfHour: (minute: number) => Schedule<number> = internal.minuteOfHour

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 *
 * @since 2.0.0
 * @category Timing & Delay
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
 * @category Timing & Delay
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
 * @category Constructors
 */
export const once: Schedule<void> = internal.once

/**
 * Returns a new schedule that passes through the inputs of this schedule.
 *
 * @since 2.0.0
 */
export const passthrough: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<In, In, R> = internal.passthrough

/**
 * Returns a new schedule with its context provided to it, so the
 * resulting schedule does not require any context.
 *
 * @since 2.0.0
 * @category Context
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
 * @category Context
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
 */
export const recurUntil: <A>(f: Predicate<A>) => Schedule<A, A> = internal.recurUntil

/**
 * A schedule that recurs for until the predicate evaluates to true.
 *
 * @since 2.0.0
 */
export const recurUntilEffect: <A, R>(f: (a: A) => Effect.Effect<boolean, never, R>) => Schedule<A, A, R> =
  internal.recurUntilEffect

/**
 * A schedule that recurs for until the input value becomes applicable to
 * partial function and then map that value with given function.
 *
 * @since 2.0.0
 */
export const recurUntilOption: <A, B>(pf: (a: A) => Option.Option<B>) => Schedule<Option.Option<B>, A> =
  internal.recurUntilOption

/**
 * A schedule that recurs during the given duration.
 *
 * @since 2.0.0
 */
export const recurUpTo: (duration: Duration.DurationInput) => Schedule<Duration.Duration> = internal.recurUpTo

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 *
 * @since 2.0.0
 */
export const recurWhile: <A>(f: Predicate<A>) => Schedule<A, A> = internal.recurWhile

/**
 * A schedule that recurs for as long as the effectful predicate evaluates to
 * true.
 *
 * @since 2.0.0
 */
export const recurWhileEffect: <A, R>(f: (a: A) => Effect.Effect<boolean, never, R>) => Schedule<A, A, R> =
  internal.recurWhileEffect

/**
 * A schedule spanning all time, which can be stepped only the specified
 * number of times before it terminates.
 *
 * @category Constructors
 * @since 2.0.0
 */
export const recurs: (n: number) => Schedule<number> = internal.recurs

/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * @since 2.0.0
 * @category Reducing
 */
export const reduce: {
  <Out, Z>(zero: Z, f: (z: Z, out: Out) => Z): <In, R>(self: Schedule<Out, In, R>) => Schedule<Z, In, R>
  <Out, In, R, Z>(self: Schedule<Out, In, R>, zero: Z, f: (z: Z, out: Out) => Z): Schedule<Z, In, R>
} = internal.reduce

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 *
 * @since 2.0.0
 * @category Reducing
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
 * @category Constructors
 */
export const repeatForever: Schedule<number> = internal.forever

/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 *
 * @since 2.0.0
 */
export const repetitions: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<number, In, R> = internal.repetitions

/**
 * Return a new schedule that automatically resets the schedule to its initial
 * state after some time of inactivity defined by `duration`.
 *
 * @since 2.0.0
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
 */
export const resetWhen: {
  <Out>(f: Predicate<Out>): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<Out>): Schedule<Out, In, R>
} = internal.resetWhen

/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 *
 * @since 2.0.0
 * @category Destructors
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
 * @category Constructors
 */
export const secondOfMinute: (second: number) => Schedule<number> = internal.secondOfMinute

/**
 * Returns a schedule that recurs continuously, each repetition spaced the
 * specified duration from the last run.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const spaced: (duration: Duration.DurationInput) => Schedule<number> = internal.spaced

/**
 * A schedule that does not recur, it just stops.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const stop: Schedule<void> = internal.stop

/**
 * Returns a schedule that repeats one time, producing the specified constant
 * value.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const succeed: <A>(value: A) => Schedule<A> = internal.succeed

/**
 * Returns a schedule that repeats one time, producing the specified constant
 * value.
 *
 * @category Constructors
 * @since 2.0.0
 */
export const sync: <A>(evaluate: LazyArg<A>) => Schedule<A> = internal.sync

/**
 * Returns a new schedule that effectfully processes every input to this
 * schedule.
 *
 * @since 2.0.0
 * @category Composition
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
 * @category Composition
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
 * @category Constructors
 */
export const unfold: <A>(initial: A, f: (a: A) => A) => Schedule<A> = internal.unfold

/**
 * Combines two schedules and recurs if either schedule wants to continue, using
 * the shorter delay.
 *
 * @since 2.0.0
 * @category Composition
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
 * @category Composition
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
 * @category Recurrence Conditions
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
 * @category Recurrence Conditions
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
 * @category Recurrence Conditions
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
 * @category Recurrence Conditions
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
 * @category Recurrence Conditions
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
 * @category Recurrence Conditions
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
 * @category Recurrence Conditions
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
 * @category Recurrence Conditions
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
 * @category Recurrence Conditions
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
 * @category Constructors
 */
export const windowed: (interval: Duration.DurationInput) => Schedule<number> = internal.windowed

/**
 * The same as `intersect` but ignores the right output.
 *
 * @since 2.0.0
 * @category Zipping
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
 * @category Zipping
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
 * @category Zipping
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

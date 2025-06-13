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
import type * as Ref from "./Ref.js"
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
 * ```ts skip-type-checking
 * //        ┌─── The type of output produced by the schedule
 * //        │   ┌─── The type of input consumed by the schedule
 * //        │   │     ┌─── Additional requirements for the schedule
 * //        ▼   ▼     ▼
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
  readonly iterationMeta: Ref.Ref<IterationMetadata>
  readonly last: Effect.Effect<Out, Cause.NoSuchElementException>
  readonly reset: Effect.Effect<void>
  next(input: In): Effect.Effect<Out, Option.Option<never>, R>
}

/**
 * Creates a new schedule with a custom state and step function.
 *
 * **Details**
 *
 * This function constructs a `Schedule` by defining its initial state and a
 * step function, which determines how the schedule progresses over time. The
 * step function is called on each iteration with the current time, an input
 * value, and the schedule's current state. It returns the next state, an output
 * value, and a decision on whether the schedule should continue or stop.
 *
 * This function is useful for creating custom scheduling logic that goes beyond
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
 * each interval, where the delay is determined by an effectful function. The
 * function takes the schedule’s output and returns an effect that produces a
 * delay duration.
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
 * This function executes two schedules one after the other. The first schedule
 * runs to completion, and then the second schedule begins execution. Unlike
 * {@link andThenEither}, this function merges the outputs instead of wrapping
 * them in `Either`, allowing both schedules to contribute their results
 * directly.
 *
 * This is useful when a workflow consists of two phases where the second phase
 * should start only after the first one has fully completed.
 *
 * @see {@link andThenEither} If you need to keep track of which schedule
 * produced each result.
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
 * - `Either.Left` contains the output of the second schedule.
 * - `Either.Right` contains the output of the first schedule.
 *
 * This is useful when you need to switch from one schedule to another after the
 * first one finishes, while still keeping track of which schedule produced each
 * result.
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
 * computed outputs, it always returns a constant value.
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
 * schedule is used only for timing purposes and the actual output of the
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
 * This function merges two schedules so that both their input types and output
 * types are retained. When executed, the resulting schedule will take inputs
 * from both original schedules and produce a tuple containing both outputs.
 *
 * It recurs if either schedule wants to continue, using the shorter delay.
 *
 * This is useful when you want to track multiple schedules simultaneously,
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
 * This function modifies a schedule by applying a custom test function to each
 * input-output pair. The test function determines whether the schedule should
 * continue or stop. If the function returns `true`, the schedule proceeds as
 * usual; if it returns `false`, the schedule terminates.
 *
 * This is useful for conditional retries, custom stop conditions, or
 * dynamically controlling execution based on observed inputs and outputs.
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
 * This function modifies a schedule by applying a custom effectful test
 * function to each input-output pair. The test function determines whether the
 * schedule should continue (`true`) or stop (`false`).
 *
 * This is useful when the decision to continue depends on external factors such
 * as database lookups, API calls, or other asynchronous computations.
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
 * This function creates a schedule that never terminates and continuously
 * collects every input it receives into a `Chunk`. Each time the schedule runs,
 * it appends the new input to the collected list.
 *
 * This is useful when you need to track all received inputs over time, such as
 * logging user actions, recording retry attempts, or accumulating data for
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
 * This is useful when you need to track all results over time, such as logging
 * outputs, aggregating data, or keeping a history of previous values.
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
 * `Chunk` until the given predicate function `f` evaluates to `false`. Once the
 * condition fails, the schedule stops.
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
 * `Chunk` until the given effectful predicate `f` returns `false`. The
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
 * `Chunk` while the given predicate function `f` evaluates to `true`. As soon
 * as the condition fails, the schedule stops.
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
 * `Chunk` while the given effectful predicate `f` returns `true`. The predicate
 * returns an effect, meaning it can depend on external state, such as database
 * queries, API responses, or real-time user conditions.
 *
 * As soon as the effectful condition returns `false`, the schedule stops. This
 * is useful for dynamically controlled data collection, where stopping depends
 * on an external or asynchronous factor.
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
 * This function composes two schedules so that the output of the first schedule
 * becomes the input of the second schedule. The first schedule executes first,
 * and once it produces a result, the second schedule receives that result and
 * continues execution based on it.
 *
 * This is useful for building complex scheduling workflows where one schedule's
 * behavior determines how the next schedule behaves.
 *
 * @since 2.0.0
 * @category Composition
 */
export const compose: {
  <Out2, Out, R2>(that: Schedule<Out2, Out, R2>): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out2, In, R2 | R>
  <Out, In, R, Out2, R2>(self: Schedule<Out, In, R>, that: Schedule<Out2, Out, R2>): Schedule<Out2, In, R | R2>
} = internal.compose

/**
 * Transforms the input type of a schedule.
 *
 * **Details**
 *
 * This function modifies a given schedule by applying a transformation function
 * to its inputs. Instead of directly receiving values of type `In`, the
 * schedule will now accept values of type `In2`, which are converted to `In`
 * using the provided mapping function `f`.
 *
 * This is useful when you have a schedule that expects a specific input type
 * but you need to adapt it to work with a different type.
 *
 * @see {@link mapInputEffect} If you need to use an effectful transformation function.
 *
 * @since 2.0.0
 * @category Mapping
 */
export const mapInput: {
  <In, In2>(f: (in2: In2) => In): <Out, R>(self: Schedule<Out, In, R>) => Schedule<Out, In2, R>
  <Out, In, R, In2>(self: Schedule<Out, In, R>, f: (in2: In2) => In): Schedule<Out, In2, R>
} = internal.mapInput

/**
 * Transforms the input type of a schedule using an effectful function.
 *
 * **Details**
 *
 * This function modifies a schedule by applying an effectful transformation to
 * its inputs. Instead of directly receiving values of type `In`, the schedule
 * will now accept values of type `In2`, which are converted to `In` via an
 * effectful function `f`.
 *
 * This is useful when the input transformation involves external dependencies,
 * such as API calls, database lookups, or other asynchronous computations.
 *
 * @see {@link mapInput} If you need to use a pure transformation function.
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
 * Transforms the required context of a schedule.
 *
 * **Details**
 *
 * This function modifies a schedule by mapping its required context (`R`) into
 * a new context (`R0`) using the provided function `f`.
 *
 * This is useful when you need to adapt a schedule to work with a different
 * dependency environment without changing its core logic.
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
 * A schedule that recurs indefinitely, counting the number of recurrences.
 *
 * **Details**
 *
 * This schedule never stops and simply counts how many times it has executed.
 * Each recurrence increases the count, starting from `0`.
 *
 * This is useful when tracking the number of attempts in retry policies,
 * measuring execution loops, or implementing infinite polling scenarios.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const count: Schedule<number> = internal.count

/**
 * Creates a schedule that recurs based on a cron expression.
 *
 * **Details**
 *
 * This schedule automatically executes at intervals defined by a cron
 * expression. It triggers at the beginning of each matched interval and
 * produces timestamps representing the start and end of the cron window.
 *
 * The cron `expression` is validated lazily, meaning errors may only be
 * detected when the schedule is executed.
 *
 * @since 2.0.0
 * @category Cron
 */
export const cron: {
  (cron: Cron.Cron): Schedule<[number, number]>
  (expression: string, tz?: DateTime.TimeZone | string): Schedule<[number, number]>
} = internal.cron

/**
 * Cron-like schedule that recurs at a specific second of each minute.
 *
 * **Details**
 *
 * This schedule triggers at the specified `second` of each minute,
 * starting at zero nanoseconds. It produces a count of executions
 * (0, 1, 2, ...). The `second` parameter is validated lazily, meaning
 * invalid values will only be caught at runtime.
 *
 * @since 2.0.0
 * @category Cron
 */
export const secondOfMinute: (second: number) => Schedule<number> = internal.secondOfMinute

/**
 * Creates a schedule that recurs every specified minute of each hour.
 *
 * **Details**
 *
 * This schedule triggers once per hour at the specified `minute`, starting
 * exactly at `minute:00` (zero seconds). The schedule produces a count of
 * executions (`0, 1, 2, ...`), representing how many times it has run.
 *
 * The `minute` parameter must be between `0` and `59`. It is validated lazily,
 * meaning an invalid value will cause errors only when the schedule is
 * executed.
 *
 * @since 2.0.0
 * @category Cron
 */
export const minuteOfHour: (minute: number) => Schedule<number> = internal.minuteOfHour

/**
 * Creates a schedule that recurs at a specific hour of each day.
 *
 * **Details**
 *
 * This schedule triggers once per day at the specified `hour`, starting at zero
 * minutes of that hour. The schedule produces a count of executions (`0, 1, 2,
 * ...`), indicating how many times it has been triggered.
 *
 * The `hour` parameter must be between `0` (midnight) and `23` (11 PM). It is
 * validated lazily, meaning an invalid value will cause errors only when the
 * schedule is executed.
 *
 * This is useful for scheduling daily recurring tasks at a fixed time, such as
 * running batch jobs or refreshing data.
 *
 * @since 2.0.0
 * @category Cron
 */
export const hourOfDay: (hour: number) => Schedule<number> = internal.hourOfDay

/**
 * Creates a schedule that recurs on a specific day of the month.
 *
 * **Details**
 *
 * This schedule triggers at midnight on the specified day of each month. It
 * will not execute in months that have fewer days than the given day. For
 * example, if the schedule is set to run on the 31st, it will not execute in
 * months with only 30 days.
 *
 * The schedule produces a count of executions, starting at 0 and incrementing
 * with each recurrence.
 *
 * The `day` parameter is validated lazily, meaning errors may only be detected
 * when the schedule is executed.
 *
 * @since 2.0.0
 * @category Cron
 */
export const dayOfMonth: (day: number) => Schedule<number> = internal.dayOfMonth

/**
 * Creates a schedule that recurs on a specific day of the week.
 *
 * **Details**
 *
 * This schedule triggers at midnight on the specified day of the week. The
 * `day` parameter follows the standard convention where `Monday = 1` and
 * `Sunday = 7`. The schedule produces a count of executions, starting at 0 and
 * incrementing with each recurrence.
 *
 * The `day` parameter is validated lazily, meaning errors may only be detected
 * when the schedule is executed.
 *
 * @since 2.0.0
 * @category Cron
 */
export const dayOfWeek: (day: number) => Schedule<number> = internal.dayOfWeek

/**
 * Modifies a schedule by adding a computed delay before each execution.
 *
 * **Details**
 *
 * This function adjusts an existing schedule by applying a transformation to
 * its delays. Instead of using the default interval, each delay is modified
 * using the provided function `f`, which takes the current delay and returns a
 * new delay.
 *
 * This is useful for dynamically adjusting wait times between executions, such
 * as introducing jitter, exponential backoff, or custom delay logic.
 *
 * @see {@link delayedEffect} If you need to compute the delay using an effectful function.
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
 * Modifies a schedule by adding an effectfully computed delay before each
 * execution.
 *
 * **Details**
 *
 * This function adjusts an existing schedule by introducing a delay that is
 * computed via an effect. Instead of using a fixed delay, each interval is
 * dynamically adjusted based on an effectful function `f`, which takes the
 * current delay and returns a new delay wrapped in an `Effect`.
 *
 * This is useful for adaptive scheduling where delays depend on external
 * factors, such as API calls, database queries, or dynamic system conditions.
 *
 * @see {@link delayed} If you need to compute the delay using a pure function.
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
 * Uses the delays produced by a schedule to further delay its intervals.
 *
 * **Details**
 *
 * This function modifies a schedule by using its own output delays to control
 * its execution timing. Instead of executing immediately at each interval, the
 * schedule will be delayed by the duration it produces.
 *
 * @since 2.0.0
 * @category Timing & Delay
 */
export const delayedSchedule: <In, R>(
  schedule: Schedule<Duration.Duration, In, R>
) => Schedule<Duration.Duration, In, R> = internal.delayedSchedule

/**
 * Transforms a schedule to output the delay between each occurrence.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that instead of producing its
 * original output, it now returns the delay between each scheduled execution.
 *
 * @since 2.0.0
 * @category Monitoring
 */
export const delays: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Duration.Duration, In, R> = internal.delays

/**
 * Transforms both the input and output of a schedule.
 *
 * **Details**
 *
 * This function modifies an existing schedule by applying a transformation to
 * both its input values and its output values. The provided transformation
 * functions `onInput` and `onOutput` allow you to map the schedule to work with
 * a different input type while modifying its outputs as well.
 *
 * @see {@link mapBothEffect} If you need to use effectful transformation functions.
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
 * Transforms both the input and output of a schedule using effectful
 * computations.
 *
 * **Details**
 *
 * This function modifies an existing schedule by applying effectful
 * transformations to both its input values and its output values. The provided
 * effectful functions `onInput` and `onOutput` allow you to transform inputs
 * and outputs using computations that may involve additional logic, resource
 * access, or side effects.
 *
 * @see {@link mapBoth} If you need to use pure transformation functions.
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
 * Creates a driver to manually control the execution of a schedule.
 *
 * **Details**
 *
 * This function returns a `ScheduleDriver`, which allows stepping through a
 * schedule manually while handling delays and sleeping appropriately. A driver
 * is useful when you need fine-grained control over how a schedule progresses,
 * rather than relying on automatic execution.
 *
 * The returned driver exposes methods for retrieving the current state,
 * executing the next step, and resetting the schedule when needed.
 *
 * @since 2.0.0
 * @category getter
 */
export const driver: <Out, In, R>(
  self: Schedule<Out, In, R>
) => Effect.Effect<ScheduleDriver<Out, In, R>> = internal.driver

// TODO(4.0): remove?
/**
 * Alias of {@link fromDelay}.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const duration: (duration: Duration.DurationInput) => Schedule<Duration.Duration> = internal.duration

// TODO(4.0): remove?
/**
 * Alias of {@link union}.
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

// TODO(4.0): remove?
/**
 * Alias of {@link unionWith}.
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
 * Creates a schedule that tracks the total elapsed duration since it started.
 *
 * **Details**
 *
 * This schedule executes continuously and returns the total time that has
 * passed since the first execution. The duration keeps increasing with each
 * step, providing a way to measure elapsed time.
 *
 * This is useful for tracking execution time, monitoring delays, or
 * implementing logic based on how long a process has been running.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const elapsed: Schedule<Duration.Duration> = internal.elapsed

/**
 * Attaches a finalizer to a schedule that runs when the schedule completes.
 *
 * **Details**
 *
 * This function returns a new schedule that executes a given finalizer when the
 * schedule reaches completion. Unlike `Effect.ensuring`, this method does not
 * guarantee the finalizer will run in all cases. If the schedule never
 * initializes or is not driven to completion, the finalizer may not execute.
 * However, if the schedule decides not to continue, the finalizer will be
 * invoked.
 *
 * This is useful for cleaning up resources, logging, or executing other side
 * effects when a schedule completes.
 *
 * @since 2.0.0
 * @category Finalization
 */
export const ensuring: {
  <X>(finalizer: Effect.Effect<X, never, never>): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R, X>(self: Schedule<Out, In, R>, finalizer: Effect.Effect<X, never, never>): Schedule<Out, In, R>
} = internal.ensuring

/**
 * Creates a schedule that recurs indefinitely with exponentially increasing
 * delays.
 *
 * **Details**
 *
 * This schedule starts with an initial delay of `base` and increases the delay
 * exponentially on each repetition using the formula `base * factor^n`, where
 * `n` is the number of times the schedule has executed so far. If no `factor`
 * is provided, it defaults to `2`, causing the delay to double after each
 * execution.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const exponential: (
  base: Duration.DurationInput,
  factor?: number
) => Schedule<Duration.Duration> = internal.exponential

/**
 * Creates a schedule that recurs indefinitely with Fibonacci-based increasing
 * delays.
 *
 * **Details**
 *
 * This schedule starts with an initial delay of `one` and increases subsequent
 * delays by summing the two previous delays, following the Fibonacci sequence.
 * The delay pattern follows: `one, one, one + one, (one + one) + one, ...`,
 * resulting in `1s, 1s, 2s, 3s, 5s, 8s, 13s, ...` if `one = 1s`.
 *
 * This is useful for progressive backoff strategies, where delays grow
 * naturally over time without increasing as aggressively as an exponential
 * schedule.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const fibonacci: (one: Duration.DurationInput) => Schedule<Duration.Duration> = internal.fibonacci

/**
 * Creates a schedule that recurs at a fixed interval.
 *
 * **Details**
 *
 * This schedule executes at regular, evenly spaced intervals, returning the
 * number of times it has run so far. If the action being executed takes longer
 * than the interval, the next execution will happen immediately to prevent
 * "pile-ups," ensuring that the schedule remains consistent without overlapping
 * executions.
 *
 * ```text
 * |-----interval-----|-----interval-----|-----interval-----|
 * |---------action--------||action|-----|action|-----------|
 * ```
 *
 * @see {@link spaced} If you need to run from the end of the last execution.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const fixed: (interval: Duration.DurationInput) => Schedule<number> = internal.fixed

/**
 * Creates a schedule that recurs indefinitely, producing a count of
 * repetitions.
 *
 * **Details**
 *
 * This schedule runs indefinitely, returning an increasing count of executions
 * (`0, 1, 2, 3, ...`). Each step increments the count by one, allowing tracking
 * of how many times it has executed.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const forever: Schedule<number> = internal.forever

/**
 * Creates a schedule that recurs once after a specified duration.
 *
 * **Details**
 *
 * This schedule executes a single time after waiting for the given duration.
 * Once it has executed, it does not repeat.
 *
 * @see {@link fromDelays} If you need to create a schedule with multiple delays.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const fromDelay: (delay: Duration.DurationInput) => Schedule<Duration.Duration> = internal.fromDelay

/**
 * Creates a schedule that recurs once for each specified duration, applying the
 * given delays sequentially.
 *
 * **Details**
 *
 * This schedule executes multiple times, each time waiting for the
 * corresponding duration from the provided list of delays. The first execution
 * waits for `delay`, the next for the second value in `delays`, and so on. Once
 * all delays have been used, the schedule stops executing.
 *
 * This is useful for defining a custom delay sequence that does not follow a
 * fixed pattern like exponential or Fibonacci backoff.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const fromDelays: (
  delay: Duration.DurationInput,
  ...delays: Array<Duration.DurationInput>
) => Schedule<Duration.Duration> = internal.fromDelays

/**
 * Creates a schedule that always recurs, transforming input values using the
 * specified function.
 *
 * **Details**
 *
 * This schedule continuously executes and applies the given function `f` to
 * each input value, producing a transformed output. The schedule itself does
 * not control delays or stopping conditions; it simply transforms the input
 * values as they are processed.
 *
 * This is useful when defining schedules that map inputs to outputs, allowing
 * dynamic transformations of incoming data.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const fromFunction: <A, B>(f: (a: A) => B) => Schedule<B, A> = internal.fromFunction

/**
 * Creates a schedule that always recurs, passing inputs directly as outputs.
 *
 * **Details**
 *
 * This schedule runs indefinitely, returning each input value as its output
 * without modification. It effectively acts as a pass-through that simply
 * echoes its input values at each step.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const identity: <A>() => Schedule<A, A> = internal.identity

/**
 * Transforms a schedule to pass through its inputs as outputs.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that it returns its input
 * values instead of its original output values. The schedule's timing remains
 * unchanged, but its outputs are replaced with whatever inputs it receives.
 *
 * @since 2.0.0
 */
export const passthrough: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<In, In, R> = internal.passthrough

/**
 * Combines two schedules, continuing only if both schedules want to continue,
 * using the longer delay.
 *
 * **Details**
 *
 * This function takes two schedules and creates a new schedule that only
 * continues execution if both schedules allow it. The interval between
 * recurrences is determined by the longer delay between the two schedules.
 *
 * The output of the resulting schedule is a tuple containing the outputs of
 * both schedules. The input type is the intersection of both schedules' input
 * types.
 *
 * This is useful when coordinating multiple scheduling conditions where
 * execution should proceed only when both schedules permit it.
 *
 * @see {@link intersectWith} If you need to use a custom merge function.
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
 * Combines two schedules, continuing only if both want to continue, merging
 * intervals using a custom function.
 *
 * **Details**
 *
 * This function takes two schedules and creates a new schedule that only
 * continues execution if both schedules allow it. Instead of automatically
 * using the longer delay (like {@link intersect}), this function applies a
 * user-provided merge function `f` to determine the next interval between
 * executions.
 *
 * The output of the resulting schedule is a tuple containing the outputs of
 * both schedules, and the input type is the intersection of both schedules'
 * input types.
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
 * Returns a new schedule that randomly adjusts the interval size within a
 * range.
 *
 * **Details**
 *
 * This function modifies a schedule so that its delay between executions is
 * randomly varied within a range. By default, the delay is adjusted between
 * `80%` (`0.8 * interval`) and `120%` (`1.2 * interval`) of the original
 * interval size.
 *
 * This is useful for adding randomness to repeated executions, reducing
 * contention in distributed systems, and avoiding synchronized execution
 * patterns that can cause bottlenecks.
 *
 * @see {@link jitteredWith} If you need to specify custom min/max values.
 *
 * @since 2.0.0
 * @category Timing & Delay
 */
export const jittered: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R> = internal.jittered

/**
 * Returns a new schedule that randomly adjusts the interval size within a
 * user-defined range.
 *
 * **Details**
 *
 * This function modifies a schedule so that its delay between executions is
 * randomly varied within a specified range. Instead of using the default `0.8 -
 * 1.2` range like {@link jittered}, this function allows customizing the `min`
 * and `max` multipliers.
 *
 * The delay for each step will be adjusted within `min * original_interval` and
 * `max * original_interval`. If `min` and `max` are not provided, the defaults
 * are `0.8` and `1.2`, respectively.
 *
 * This is useful for introducing randomness into scheduling behavior while
 * having precise control over the jitter range.
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
 * Creates a schedule that recurs indefinitely, increasing the delay linearly.
 *
 * **Details**
 *
 * This schedule starts with an initial delay of `base` and increases the delay
 * on each recurrence in a linear fashion, following the formula:
 *
 * `delay = base * n`
 *
 * where `n` is the number of times the schedule has executed so far. This
 * results in increasing intervals between executions.
 *
 * This is useful for implementing linear backoff strategies where the wait time
 * between retries increases at a steady rate.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const linear: (base: Duration.DurationInput) => Schedule<Duration.Duration> = internal.linear

/**
 * Returns a new schedule that transforms its output using the specified
 * function.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that its outputs are
 * transformed by the provided function `f`. The timing and recurrence behavior
 * of the schedule remain unchanged, but the values it produces are mapped to
 * new values.
 *
 * This is useful when composing schedules where you need to adjust the output
 * format or apply additional processing.
 *
 * @see {@link mapEffect} If you need to use an effectful transformation
 * function.
 *
 * @since 2.0.0
 * @category Mapping
 */
export const map: {
  <Out, Out2>(f: (out: Out) => Out2): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out2, In, R>
  <Out, In, R, Out2>(self: Schedule<Out, In, R>, f: (out: Out) => Out2): Schedule<Out2, In, R>
} = internal.map

/**
 * Returns a new schedule that applies an effectful transformation to its
 * output.
 *
 * **Details**
 *
 * This function modifies an existing schedule by applying an effectful function
 * `f` to its output values. The timing and recurrence behavior of the schedule
 * remain unchanged, but each output is mapped to a new value within an
 * `Effect`.
 *
 * This is useful when you need to perform side effects or asynchronous
 * transformations before passing the output forward.
 *
 * @see {@link map} If you need to use a pure transformation function.
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
 * Returns a new schedule that modifies the delay between executions using a
 * custom function.
 *
 * **Details**
 *
 * This function transforms an existing schedule by applying `f` to modify the
 * delay before each execution. The function receives both the schedule's output
 * (`out`) and the originally computed delay (`duration`), and returns a new
 * adjusted delay.
 *
 * @see {@link modifyDelayEffect} If you need to use an effectful function.
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
 * Returns a new schedule that modifies the delay before execution using an
 * effectful function.
 *
 * **Details**
 *
 * This function takes an existing schedule and applies an effectful function
 * `f` to dynamically adjust the delay before each execution. The function
 * receives both the schedule's output (`out`) and the originally computed delay
 * (`duration`), returning a new adjusted delay wrapped in an `Effect`.
 *
 * @see {@link modifyDelay} If you need to use a pure function.
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
 * Returns a new schedule that executes an effect every time the schedule makes
 * a decision.
 *
 * **Details**
 *
 * This function enhances an existing schedule by running an effectful function
 * `f` whenever a scheduling decision is made. The function receives the current
 * schedule output (`out`) and the decision (`ScheduleDecision`), allowing
 * additional logic to be executed, such as logging, monitoring, or side
 * effects.
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
 * A schedule that executes only once and then stops.
 *
 * **Details**
 *
 * This schedule triggers a single execution and then terminates. It does not
 * repeat or apply any additional logic.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const once: Schedule<void> = internal.once

/**
 * Returns a new schedule with a provided context, eliminating the need for
 * external dependencies.
 *
 * **Details**
 *
 * This function supplies a required `context` to a schedule, allowing it to run
 * without requiring external dependencies. After calling this function, the
 * schedule can be used freely without needing to pass a context at execution
 * time.
 *
 * This is useful when working with schedules that rely on contextual
 * information, such as logging services, database connections, or configuration
 * settings.
 *
 * @since 2.0.0
 * @category Context
 */
export const provideContext: {
  <R>(context: Context.Context<R>): <Out, In>(self: Schedule<Out, In, R>) => Schedule<Out, In, never>
  <Out, In, R>(self: Schedule<Out, In, R>, context: Context.Context<R>): Schedule<Out, In, never>
} = internal.provideContext

/**
 * Returns a new schedule with a single required service provided, eliminating
 * the need for external dependencies.
 *
 * **Details**
 *
 * This function supplies a single service dependency to a schedule, allowing it
 * to run without requiring that service externally. If a schedule depends on
 * multiple services, consider using `provideContext` instead.
 *
 * This is useful when working with schedules that require a specific service,
 * such as logging, metrics, or configuration retrieval.
 *
 * @since 2.0.0
 * @category Context
 */
export const provideService: {
  <I, S>(
    tag: Context.Tag<I, S>,
    service: Types.NoInfer<S>
  ): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, Exclude<R, I>>
  <Out, In, R, I, S>(
    self: Schedule<Out, In, R>,
    tag: Context.Tag<I, S>,
    service: Types.NoInfer<S>
  ): Schedule<Out, In, Exclude<R, I>>
} = internal.provideService

/**
 * A schedule that recurs until the given predicate evaluates to true.
 *
 * **Details**
 *
 * This schedule will continue executing as long as the provided predicate `f`
 * returns `false` for the input value. Once `f` evaluates to `true`, the
 * schedule stops recurring.
 *
 * This is useful for defining schedules that should stop when a certain
 * condition is met, such as detecting a success state, reaching a threshold, or
 * avoiding unnecessary retries.
 *
 * @see {@link recurUntilEffect} If you need to use an effectful predicate.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const recurUntil: <A>(f: Predicate<A>) => Schedule<A, A> = internal.recurUntil

/**
 * A schedule that recurs until the given effectful predicate evaluates to true.
 *
 * **Details**
 *
 * This schedule continues executing as long as the provided effectful predicate
 * `f` returns `false`. Once `f` evaluates to `true`, the schedule stops
 * recurring. Unlike {@link recurUntil}, this function allows the stopping
 * condition to be computed asynchronously or based on external dependencies.
 *
 * This is useful when the stopping condition depends on an effectful
 * computation, such as checking a database, making an API call, or retrieving
 * system state dynamically.
 *
 * @see {@link recurUntil} If you need to use a pure predicate.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const recurUntilEffect: <A, R>(f: (a: A) => Effect.Effect<boolean, never, R>) => Schedule<A, A, R> =
  internal.recurUntilEffect

/**
 * A schedule that recurs until the input value matches a partial function, then
 * maps the value.
 *
 * **Details**
 *
 * This schedule continues executing until the provided partial function `pf`
 * returns `Some(value)`. At that point, it stops and maps the resulting value
 * to an `Option<B>`. If `pf` returns `None`, the schedule continues.
 *
 * This is useful when defining schedules that should stop once a certain
 * condition is met and transform the final value before completion.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const recurUntilOption: <A, B>(pf: (a: A) => Option.Option<B>) => Schedule<Option.Option<B>, A> =
  internal.recurUntilOption

/**
 * A schedule that recurs until the specified duration has elapsed.
 *
 * **Details**
 *
 * This schedule continues executing for the given `duration`, after which it
 * stops. The schedule outputs the elapsed time on each recurrence.
 *
 * This is useful for limiting the duration of retries, enforcing time-based
 * constraints, or ensuring that an operation does not run indefinitely.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const recurUpTo: (duration: Duration.DurationInput) => Schedule<Duration.Duration> = internal.recurUpTo

/**
 * A schedule that recurs as long as the given predicate evaluates to true.
 *
 * **Details*
 *
 * This schedule continues executing as long as the provided predicate `f`
 * returns `true` for the input value. Once `f` evaluates to `false`, the
 * schedule stops recurring.
 *
 * @see {@link recurWhileEffect} If you need to use an effectful predicate.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const recurWhile: <A>(f: Predicate<A>) => Schedule<A, A> = internal.recurWhile

/**
 * A schedule that recurs as long as the given effectful predicate evaluates to
 * true.
 *
 * **Details**
 *
 * This schedule continues executing as long as the provided effectful predicate
 * `f` returns `true`. Once `f` evaluates to `false`, the schedule stops
 * recurring. Unlike {@link recurWhile}, this function allows the condition to
 * be computed dynamically using an effectful computation.
 *
 * @see {@link recurWhile} If you need to use a pure predicate.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const recurWhileEffect: <A, R>(f: (a: A) => Effect.Effect<boolean, never, R>) => Schedule<A, A, R> =
  internal.recurWhileEffect

/**
 * A schedule that recurs a fixed number of times before terminating.
 *
 * **Details**
 *
 * This schedule will continue executing until it has been stepped `n` times,
 * after which it will stop. The output of the schedule is the current count of
 * recurrences.
 *
 * @category Constructors
 * @since 2.0.0
 */
export const recurs: (n: number) => Schedule<number> = internal.recurs

/**
 * Returns a new schedule that folds over the outputs of this one.
 *
 * **Details**
 *
 * This schedule transforms the output by accumulating values over time using a
 * reducer function `f`. It starts with an initial value `zero` and updates it
 * each time the schedule produces an output.
 *
 * This is useful for tracking statistics, aggregating results, or summarizing
 * data across multiple executions.
 *
 * @see {@link reduceEffect} If you need to use an effectful reducer function.
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
 * **Details**
 *
 * This schedule accumulates outputs over time using an effectful reducer
 * function `f`. It starts with an initial value `zero` and updates it
 * asynchronously or based on external dependencies.
 *
 * This is useful for asynchronous state tracking, logging, external metrics
 * aggregation, or any scenario where accumulation needs to involve an effectful
 * computation.
 *
 * @see {@link reduce} If you need to use a pure reducer function.
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

// TODO(4.0): remove?
/**
 * Alias of {@link forever}.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const repeatForever: Schedule<number> = internal.forever

/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 *
 * **Details**
 *
 * This schedule tracks how many times the given schedule has executed and
 * outputs the count instead of the original values. The first execution starts
 * at `0`, and the count increases with each recurrence.
 *
 * @since 2.0.0
 * @category Monitoring
 */
export const repetitions: <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<number, In, R> = internal.repetitions

/**
 * Returns a new schedule that automatically resets to its initial state after a
 * period of inactivity defined by `duration`.
 *
 * **Details**
 *
 * This function modifies a schedule so that if no inputs are received for the
 * specified `duration`, the schedule resets as if it were new.
 *
 * @see {@link resetWhen} If you need to reset based on output values.
 *
 * @since 2.0.0
 * @category State Management
 */
export const resetAfter: {
  (duration: Duration.DurationInput): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, duration: Duration.DurationInput): Schedule<Out, In, R>
} = internal.resetAfter

/**
 * Resets the schedule when the specified predicate on the schedule output
 * evaluates to `true`.
 *
 * **Details**
 *
 * This function modifies a schedule so that it resets to its initial state
 * whenever the provided predicate `f` returns `true` for an output value.
 *
 * @see {@link resetAfter} If you need to reset based on inactivity.
 *
 * @since 2.0.0
 * @category State Management
 */
export const resetWhen: {
  <Out>(f: Predicate<Out>): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<Out>): Schedule<Out, In, R>
} = internal.resetWhen

/**
 * Runs a schedule using the provided inputs and collects all outputs.
 *
 * **Details**
 *
 * This function executes a given schedule with a sequence of input values and
 * accumulates all outputs into a `Chunk`. The schedule starts execution at the
 * specified `now` timestamp and proceeds according to its defined behavior.
 *
 * This is useful for batch processing, simulating execution, or testing
 * schedules with predefined input sequences.
 *
 * @since 2.0.0
 * @category Execution
 */
export const run: {
  <In>(
    now: number,
    input: Iterable<In>
  ): <Out, R>(self: Schedule<Out, In, R>) => Effect.Effect<Chunk.Chunk<Out>, never, R>
  <Out, In, R>(self: Schedule<Out, In, R>, now: number, input: Iterable<In>): Effect.Effect<Chunk.Chunk<Out>, never, R>
} = internal.run

/**
 * Returns a schedule that recurs continuously, with each repetition
 * spaced by the specified `duration` from the last run.
 *
 * **Details**
 *
 * This schedule ensures that executions occur at a fixed interval,
 * maintaining a consistent delay between repetitions. The delay starts
 * from the end of the last execution, not from the schedule start time.
 *
 * @see {@link fixed} If you need to run at a fixed interval from the start.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const spaced: (duration: Duration.DurationInput) => Schedule<number> = internal.spaced

/**
 * A schedule that does not recur and stops immediately.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const stop: Schedule<void> = internal.stop

/**
 * Returns a schedule that recurs indefinitely, always producing the specified
 * constant value.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const succeed: <A>(value: A) => Schedule<A> = internal.succeed

/**
 * Returns a schedule that recurs indefinitely, evaluating the given function to
 * produce a constant value.
 *
 * @category Constructors
 * @since 2.0.0
 */
export const sync: <A>(evaluate: LazyArg<A>) => Schedule<A> = internal.sync

/**
 * Returns a new schedule that runs the given effectful function for each input
 * before continuing execution.
 *
 * **Details**
 *
 * This function allows side effects to be performed on each input processed by
 * the schedule. It does not modify the schedule’s behavior but ensures that the
 * provided function `f` runs before each step.
 *
 * @since 2.0.0
 * @category Tapping
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
 * Returns a new schedule that runs the given effectful function for each output
 * before continuing execution.
 *
 * **Details**
 *
 * This function allows side effects to be performed on each output produced by
 * the schedule. It does not modify the schedule’s behavior but ensures that the
 * provided function `f` runs after each step.
 *
 * @since 2.0.0
 * @category Tapping
 */
export const tapOutput: {
  <X, R2, Out>(
    f: (out: Types.NoInfer<Out>) => Effect.Effect<X, never, R2>
  ): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R2 | R>
  <Out, In, R, X, R2>(
    self: Schedule<Out, In, R>,
    f: (out: Out) => Effect.Effect<X, never, R2>
  ): Schedule<Out, In, R | R2>
} = internal.tapOutput

/**
 * Creates a schedule that repeatedly applies a function to transform a state
 * value, producing a sequence of values.
 *
 * **Details**
 *
 * This function starts with an `initial` value and applies `f` recursively to
 * generate the next state at each step. The schedule continues indefinitely,
 * producing a stream of values by unfolding the state over time.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const unfold: <A>(initial: A, f: (a: A) => A) => Schedule<A> = internal.unfold

/**
 * Combines two schedules, continuing execution as long as at least one of them
 * allows it, using the shorter delay.
 *
 * **Details**
 *
 * This function combines two schedules into a single schedule that executes in
 * parallel. If either schedule allows continuation, the merged schedule
 * continues. When both schedules produce delays, the schedule selects the
 * shorter delay to determine the next step.
 *
 * The output of the new schedule is a tuple containing the outputs of both
 * schedules. The input type is the intersection of both schedules' input types.
 *
 * This is useful for scenarios where multiple scheduling conditions should be
 * considered, ensuring execution proceeds if at least one schedule permits it.
 *
 * @see {@link unionWith} If you need to use a custom merge function.
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
 * Combines two schedules, continuing execution as long as at least one of them
 * wants to continue, merging their intervals using a custom merge function.
 *
 * **Details**
 *
 * This function allows you to combine two schedules while defining how their
 * intervals should be merged. Unlike {@link union}, which simply selects the
 * shorter delay, this function lets you specify a custom merging strategy for
 * the schedules’ intervals.
 *
 * The merged schedule continues execution as long as at least one of the input
 * schedules allows it. The next interval is determined by applying the provided
 * merge function to the intervals of both schedules.
 *
 * The output of the resulting schedule is a tuple containing the outputs of
 * both schedules. The input type is the intersection of both schedules' input
 * types.
 *
 * @see {@link union} If you need to use the shorter delay.
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
 * Returns a new schedule that stops execution when the given predicate on the
 * input evaluates to `true`.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that it continues executing
 * only while the provided predicate returns `false` for incoming inputs. Once
 * an input satisfies the condition, the schedule terminates immediately.
 *
 * @see {@link untilInputEffect} If you need to use an effectful predicate.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const untilInput: {
  <In>(f: Predicate<In>): <Out, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<In>): Schedule<Out, In, R>
} = internal.untilInput

/**
 * Returns a new schedule that stops execution when the given effectful
 * predicate on the input evaluates to `true`.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that it continues executing
 * only while the provided effectful predicate returns `false` for incoming
 * inputs. The predicate is an `Effect`, meaning it can involve asynchronous
 * computations or dependency-based logic.
 *
 * @see {@link untilInput} If you need to use a pure predicate.
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
 * Returns a new schedule that stops execution when the given predicate on the
 * output evaluates to `true`.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that it only continues
 * executing while the given predicate returns false for its output values. Once
 * the predicate evaluates to `true`, execution stops.
 *
 * The output of the resulting schedule remains the same, but its duration is
 * now constrained by a stopping condition based on its own output.
 *
 * @see {@link untilOutputEffect} If you need to use an effectful predicate.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const untilOutput: {
  <Out>(f: Predicate<Out>): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<Out>): Schedule<Out, In, R>
} = internal.untilOutput

/**
 * Returns a new schedule that stops execution when the given effectful
 * predicate on the output evaluates to `true`.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that it only continues
 * executing while the provided effectful predicate returns `false` for its
 * output values. Once the predicate returns `true`, execution stops.
 *
 * @see {@link untilOutput} If you need to use a pure predicate.
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
 * Returns a new schedule that limits execution to a fixed duration.
 *
 * **Details**
 *
 * This function modifies an existing schedule to stop execution after a
 * specified duration has passed. The schedule continues as normal until the
 * duration is reached, at which point it stops automatically.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const upTo: {
  (duration: Duration.DurationInput): <Out, In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, duration: Duration.DurationInput): Schedule<Out, In, R>
} = internal.upTo

/**
 * Returns a new schedule that continues execution as long as the given
 * predicate on the input is true.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that it only continues
 * execution while a specified predicate holds true for its input. If the
 * predicate evaluates to `false` at any step, the schedule stops.
 *
 * @see {@link whileInputEffect} If you need to use an effectful predicate.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const whileInput: {
  <In>(f: Predicate<In>): <Out, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<In>): Schedule<Out, In, R>
} = internal.whileInput

/**
 * Returns a new schedule that continues execution for as long as the given
 * effectful predicate on the input evaluates to `true`.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that it only continues
 * execution while an effectful predicate holds true for its input. If the
 * predicate evaluates to `false` at any step, the schedule stops.
 *
 * @see {@link whileInput} If you need to use a pure predicate.
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
 * Returns a new schedule that continues execution for as long as the given
 * predicate on the output evaluates to `true`.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that it only continues
 * execution while a provided condition holds true for its output. If the
 * predicate returns `false`, the schedule stops.
 *
 * @see {@link whileOutputEffect} If you need to use an effectful predicate.
 *
 * @since 2.0.0
 * @category Recurrence Conditions
 */
export const whileOutput: {
  <Out>(f: Predicate<Out>): <In, R>(self: Schedule<Out, In, R>) => Schedule<Out, In, R>
  <Out, In, R>(self: Schedule<Out, In, R>, f: Predicate<Out>): Schedule<Out, In, R>
} = internal.whileOutput

/**
 * Returns a new schedule that continues execution for as long as the given
 * effectful predicate on the output evaluates to `true`.
 *
 * **Details**
 *
 * This function modifies an existing schedule so that it only continues
 * execution while an effectful condition holds true for its output. If the
 * effectful predicate returns `false`, the schedule stops.
 *
 * @see {@link whileOutput} If you need to use a pure predicate.
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
 * Creates a schedule that divides time into fixed `interval`-long windows,
 * triggering execution at the start of each new window.
 *
 * **Details**
 *
 * This function produces a schedule that waits until the next time window
 * boundary before executing. Each window spans a fixed duration specified by
 * `interval`. If an action completes midway through a window, the schedule
 * waits until the next full window starts before proceeding.
 *
 * For example, `windowed(Duration.seconds(10))` would produce a schedule as
 * follows:
 *
 * ```text
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
 * The same as {@link intersect} but ignores the right output.
 *
 * @since 2.0.0
 * @category Composition
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
 * The same as {@link intersect} but ignores the left output.
 *
 * @since 2.0.0
 * @category Composition
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
 * Equivalent to {@link intersect} followed by {@link map}.
 *
 * @since 2.0.0
 * @category Composition
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

/**
 * @since 3.15.0
 * @category models
 */
export interface CurrentIterationMetadata {
  readonly _: unique symbol
}

/**
 * @since 3.15.0
 * @category models
 */
export interface IterationMetadata {
  readonly input: unknown
  readonly output: unknown
  readonly recurrence: number
  readonly start: number
  readonly now: number
  readonly elapsed: Duration.Duration
  readonly elapsedSincePrevious: Duration.Duration
}

/**
 * @since 3.15.0
 * @category models
 */
export const CurrentIterationMetadata: Context.Reference<
  CurrentIterationMetadata,
  IterationMetadata
> = internal.CurrentIterationMetadata

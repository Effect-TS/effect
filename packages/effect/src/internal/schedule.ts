import type * as Cause from "../Cause.js"
import * as Chunk from "../Chunk.js"
import * as Clock from "../Clock.js"
import * as Context from "../Context.js"
import * as Duration from "../Duration.js"
import type * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import * as Equal from "../Equal.js"
import type { LazyArg } from "../Function.js"
import { constVoid, dual, pipe } from "../Function.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import type { Predicate, Refinement } from "../Predicate.js"
import * as Random from "../Random.js"
import type * as Ref from "../Ref.js"
import type * as Schedule from "../Schedule.js"
import * as ScheduleDecision from "../ScheduleDecision.js"
import * as Interval from "../ScheduleInterval.js"
import * as Intervals from "../ScheduleIntervals.js"
import * as effect from "./core-effect.js"
import * as core from "./core.js"
import * as ref from "./ref.js"

/** @internal */
const ScheduleSymbolKey = "effect/Schedule"

/** @internal */
export const ScheduleTypeId: Schedule.ScheduleTypeId = Symbol.for(
  ScheduleSymbolKey
) as Schedule.ScheduleTypeId

/** @internal */
const ScheduleDriverSymbolKey = "effect/ScheduleDriver"

/** @internal */
export const ScheduleDriverTypeId: Schedule.ScheduleDriverTypeId = Symbol.for(
  ScheduleDriverSymbolKey
) as Schedule.ScheduleDriverTypeId

const scheduleVariance = {
  /* c8 ignore next */
  _Env: (_: never) => _,
  /* c8 ignore next */
  _In: (_: unknown) => _,
  /* c8 ignore next */
  _Out: (_: never) => _
}

const scheduleDriverVariance = {
  /* c8 ignore next */
  _Env: (_: never) => _,
  /* c8 ignore next */
  _In: (_: unknown) => _,
  /* c8 ignore next */
  _Out: (_: never) => _
}

/** @internal */
class ScheduleImpl<S, Env, In, Out> implements Schedule.Schedule<Env, In, Out> {
  [ScheduleTypeId] = scheduleVariance
  constructor(
    readonly initial: S,
    readonly step: (
      now: number,
      input: In,
      state: S
    ) => Effect.Effect<Env, never, readonly [S, Out, ScheduleDecision.ScheduleDecision]>
  ) {
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
class ScheduleDriverImpl<Env, In, Out> implements Schedule.ScheduleDriver<Env, In, Out> {
  [ScheduleDriverTypeId] = scheduleDriverVariance

  constructor(
    readonly schedule: Schedule.Schedule<Env, In, Out>,
    readonly ref: Ref.Ref<readonly [Option.Option<Out>, any]>
  ) {}

  get state(): Effect.Effect<never, never, unknown> {
    return core.map(ref.get(this.ref), (tuple) => tuple[1])
  }

  get last(): Effect.Effect<never, Cause.NoSuchElementException, Out> {
    return core.flatMap(ref.get(this.ref), ([element, _]) => {
      switch (element._tag) {
        case "None": {
          return core.failSync(() => new core.NoSuchElementException())
        }
        case "Some": {
          return core.succeed(element.value)
        }
      }
    })
  }

  get reset(): Effect.Effect<never, never, void> {
    return ref.set(this.ref, [Option.none(), this.schedule.initial])
  }

  next(input: In): Effect.Effect<Env, Option.Option<never>, Out> {
    return pipe(
      core.map(ref.get(this.ref), (tuple) => tuple[1]),
      core.flatMap((state) =>
        pipe(
          Clock.currentTimeMillis,
          core.flatMap((now) =>
            pipe(
              core.suspend(() => this.schedule.step(now, input, state)),
              core.flatMap(([state, out, decision]) =>
                ScheduleDecision.isDone(decision) ?
                  pipe(
                    ref.set(this.ref, [Option.some(out), state] as const),
                    core.zipRight(core.fail(Option.none()))
                  ) :
                  pipe(
                    ref.set(this.ref, [Option.some(out), state] as const),
                    core.zipRight(effect.sleep(Duration.millis(Intervals.start(decision.intervals) - now))),
                    core.as(out)
                  )
              )
            )
          )
        )
      )
    )
  }
}

/** @internal */
export const makeWithState = <S, Env, In, Out>(
  initial: S,
  step: (
    now: number,
    input: In,
    state: S
  ) => Effect.Effect<Env, never, readonly [S, Out, ScheduleDecision.ScheduleDecision]>
): Schedule.Schedule<Env, In, Out> => new ScheduleImpl(initial, step)

/** @internal */
export const addDelay = dual<
  <Out>(
    f: (out: Out) => Duration.DurationInput
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: Out) => Duration.DurationInput
  ) => Schedule.Schedule<Env, In, Out>
>(2, (self, f) => addDelayEffect(self, (out) => core.sync(() => f(out))))

/** @internal */
export const addDelayEffect = dual<
  <Out, Env2>(
    f: (out: Out) => Effect.Effect<Env2, never, Duration.DurationInput>
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out>,
  <Env, In, Out, Env2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: Out) => Effect.Effect<Env2, never, Duration.DurationInput>
  ) => Schedule.Schedule<Env | Env2, In, Out>
>(2, (self, f) =>
  modifyDelayEffect(self, (out, duration) =>
    core.map(
      f(out),
      (delay) => Duration.sum(duration, Duration.decode(delay))
    )))

/** @internal */
export const andThen = dual<
  <Env1, In1, Out2>(
    that: Schedule.Schedule<Env1, In1, Out2>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<
    Env | Env1,
    In & In1,
    Out | Out2
  >,
  <Env, In, Out, Env1, In1, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env1, In1, Out2>
  ) => Schedule.Schedule<
    Env | Env1,
    In & In1,
    Out | Out2
  >
>(2, (self, that) => map(andThenEither(self, that), Either.merge))

/** @internal */
export const andThenEither = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    Either.Either<Out, Out2>
  >,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    Either.Either<Out, Out2>
  >
>(2, <Env, In, Out, Env2, In2, Out2>(
  self: Schedule.Schedule<Env, In, Out>,
  that: Schedule.Schedule<Env2, In2, Out2>
): Schedule.Schedule<
  Env | Env2,
  In & In2,
  Either.Either<Out, Out2>
> =>
  makeWithState(
    [self.initial, that.initial, true as boolean] as const,
    (now, input, state) =>
      state[2] ?
        core.flatMap(self.step(now, input, state[0]), ([lState, out, decision]) => {
          if (ScheduleDecision.isDone(decision)) {
            return core.map(that.step(now, input, state[1]), ([rState, out, decision]) =>
              [
                [lState, rState, false as boolean] as const,
                Either.right(out) as Either.Either<Out, Out2>,
                decision as ScheduleDecision.ScheduleDecision
              ] as const)
          }
          return core.succeed(
            [
              [lState, state[1], true as boolean] as const,
              Either.left(out),
              decision
            ] as const
          )
        }) :
        core.map(that.step(now, input, state[1]), ([rState, out, decision]) =>
          [
            [state[0], rState, false as boolean] as const,
            Either.right(out) as Either.Either<Out, Out2>,
            decision
          ] as const)
  ))

/** @internal */
export const as = dual<
  <Out2>(out: Out2) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out2>,
  <Env, In, Out, Out2>(self: Schedule.Schedule<Env, In, Out>, out: Out2) => Schedule.Schedule<Env, In, Out2>
>(2, (self, out) => map(self, () => out))

/** @internal */
export const asUnit = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, In, void> => map(self, constVoid)

/** @internal */
export const bothInOut = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<
    Env | Env2,
    readonly [In, In2],
    [Out, Out2]
  >,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => Schedule.Schedule<
    Env | Env2,
    readonly [In, In2],
    [Out, Out2]
  >
>(2, (self, that) =>
  makeWithState([self.initial, that.initial], (now, [in1, in2], state) =>
    core.zipWith(
      self.step(now, in1, state[0]),
      that.step(now, in2, state[1]),
      ([lState, out, lDecision], [rState, out2, rDecision]) => {
        if (ScheduleDecision.isContinue(lDecision) && ScheduleDecision.isContinue(rDecision)) {
          const interval = pipe(lDecision.intervals, Intervals.union(rDecision.intervals))
          return [
            [lState, rState],
            [out, out2],
            ScheduleDecision.continue(interval)
          ]
        }
        return [[lState, rState], [out, out2], ScheduleDecision.done]
      }
    )))

/** @internal */
export const check = dual<
  <In, Out>(
    test: (input: In, output: Out) => boolean
  ) => <Env>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    test: (input: In, output: Out) => boolean
  ) => Schedule.Schedule<Env, In, Out>
>(2, (self, test) => checkEffect(self, (input, out) => core.sync(() => test(input, out))))

/** @internal */
export const checkEffect = dual<
  <In, Out, Env2>(
    test: (input: In, output: Out) => Effect.Effect<Env2, never, boolean>
  ) => <Env>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out>,
  <Env, In, Out, Env2>(
    self: Schedule.Schedule<Env, In, Out>,
    test: (input: In, output: Out) => Effect.Effect<Env2, never, boolean>
  ) => Schedule.Schedule<Env | Env2, In, Out>
>(2, (self, test) =>
  makeWithState(
    self.initial,
    (now, input, state) =>
      core.flatMap(self.step(now, input, state), ([state, out, decision]) => {
        if (ScheduleDecision.isDone(decision)) {
          return core.succeed([state, out, ScheduleDecision.done] as const)
        }
        return core.map(test(input, out), (cont) =>
          cont ?
            [state, out, decision] as const :
            [state, out, ScheduleDecision.done] as const)
      })
  ))
/** @internal */
export const collectAllInputs = <A>(): Schedule.Schedule<never, A, Chunk.Chunk<A>> => collectAllOutputs(identity<A>())

/** @internal */
export const collectAllOutputs = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, In, Chunk.Chunk<Out>> =>
  reduce(self, Chunk.empty<Out>(), (outs, out) => pipe(outs, Chunk.append(out)))

/** @internal */
export const collectUntil = <A>(f: Predicate<A>): Schedule.Schedule<never, A, Chunk.Chunk<A>> =>
  collectAllOutputs(recurUntil(f))

/** @internal */
export const collectUntilEffect = <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
): Schedule.Schedule<Env, A, Chunk.Chunk<A>> => collectAllOutputs(recurUntilEffect(f))

/** @internal */
export const collectWhile = <A>(f: Predicate<A>): Schedule.Schedule<never, A, Chunk.Chunk<A>> =>
  collectAllOutputs(recurWhile(f))

/** @internal */
export const collectWhileEffect = <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
): Schedule.Schedule<Env, A, Chunk.Chunk<A>> => collectAllOutputs(recurWhileEffect(f))

/** @internal */
export const compose = dual<
  <Env2, Out, Out2>(
    that: Schedule.Schedule<Env2, Out, Out2>
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out2>,
  <Env, In, Out, Env2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, Out, Out2>
  ) => Schedule.Schedule<Env | Env2, In, Out2>
>(2, (self, that) =>
  makeWithState(
    [self.initial, that.initial] as const,
    (now, input, state) =>
      core.flatMap(
        self.step(now, input, state[0]),
        ([lState, out, lDecision]) =>
          core.map(that.step(now, out, state[1]), ([rState, out2, rDecision]) =>
            ScheduleDecision.isDone(lDecision)
              ? [[lState, rState] as const, out2, ScheduleDecision.done] as const
              : ScheduleDecision.isDone(rDecision)
              ? [[lState, rState] as const, out2, ScheduleDecision.done] as const
              : [
                [lState, rState] as const,
                out2,
                ScheduleDecision.continue(pipe(lDecision.intervals, Intervals.max(rDecision.intervals)))
              ] as const)
      )
  ))

/** @internal */
export const mapInput = dual<
  <In, In2>(
    f: (in2: In2) => In
  ) => <Env, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In2, Out>,
  <Env, In, Out, In2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (in2: In2) => In
  ) => Schedule.Schedule<Env, In2, Out>
>(2, (self, f) => mapInputEffect(self, (input2) => core.sync(() => f(input2))))

/** @internal */
export const mapInputContext = dual<
  <Env0, Env>(
    f: (env0: Context.Context<Env0>) => Context.Context<Env>
  ) => <In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env0, In, Out>,
  <Env0, Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (env0: Context.Context<Env0>) => Context.Context<Env>
  ) => Schedule.Schedule<Env0, In, Out>
>(2, (self, f) =>
  makeWithState(
    self.initial,
    (now, input, state) => core.mapInputContext(self.step(now, input, state), f)
  ))

/** @internal */
export const mapInputEffect = dual<
  <In, Env2, In2>(
    f: (in2: In2) => Effect.Effect<Env2, never, In>
  ) => <Env, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In2, Out>,
  <Env, In, Out, Env2, In2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (in2: In2) => Effect.Effect<Env2, never, In>
  ) => Schedule.Schedule<Env | Env2, In2, Out>
>(2, (self, f) =>
  makeWithState(self.initial, (now, input2, state) =>
    core.flatMap(
      f(input2),
      (input) => self.step(now, input, state)
    )))

/** @internal */
export const dayOfMonth = (day: number): Schedule.Schedule<never, unknown, number> => {
  return makeWithState<[number, number], never, unknown, number>(
    [Number.NEGATIVE_INFINITY, 0],
    (now, _, state) => {
      if (!Number.isInteger(day) || day < 1 || 31 < day) {
        return core.dieSync(() =>
          new core.IllegalArgumentException(
            `Invalid argument in: dayOfMonth(${day}). Must be in range 1...31`
          )
        )
      }
      const n = state[1]
      const initial = n === 0
      const day0 = nextDayOfMonth(now, day, initial)
      const start = beginningOfDay(day0)
      const end = endOfDay(day0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1],
          n,
          ScheduleDecision.continueWith(interval)
        ]
      )
    }
  )
}

/** @internal */
export const dayOfWeek = (day: number): Schedule.Schedule<never, unknown, number> => {
  return makeWithState<[number, number], never, unknown, number>(
    [Number.MIN_SAFE_INTEGER, 0],
    (now, _, state) => {
      if (!Number.isInteger(day) || day < 1 || 7 < day) {
        return core.dieSync(() =>
          new core.IllegalArgumentException(
            `Invalid argument in: dayOfWeek(${day}). Must be in range 1 (Monday)...7 (Sunday)`
          )
        )
      }
      const n = state[1]
      const initial = n === 0
      const day0 = nextDay(now, day, initial)
      const start = beginningOfDay(day0)
      const end = endOfDay(day0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1],
          n,
          ScheduleDecision.continueWith(interval)
        ]
      )
    }
  )
}

/** @internal */
export const delayed = dual<
  (
    f: (duration: Duration.Duration) => Duration.DurationInput
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (duration: Duration.Duration) => Duration.DurationInput
  ) => Schedule.Schedule<Env, In, Out>
>(2, (self, f) => delayedEffect(self, (duration) => core.sync(() => f(duration))))

/** @internal */
export const delayedEffect = dual<
  <Env2>(
    f: (duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.DurationInput>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out>,
  <Env, In, Out, Env2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.DurationInput>
  ) => Schedule.Schedule<Env | Env2, In, Out>
>(2, (self, f) => modifyDelayEffect(self, (_, delay) => f(delay)))

/** @internal */
export const delayedSchedule = <Env, In>(
  schedule: Schedule.Schedule<Env, In, Duration.Duration>
): Schedule.Schedule<Env, In, Duration.Duration> => addDelay(schedule, (x) => x)

/** @internal */
export const delays = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Schedule.Schedule<Env, In, Duration.Duration> =>
  makeWithState(self.initial, (now, input, state) =>
    pipe(
      self.step(now, input, state),
      core.flatMap((
        [state, _, decision]
      ): Effect.Effect<never, never, [any, Duration.Duration, ScheduleDecision.ScheduleDecision]> => {
        if (ScheduleDecision.isDone(decision)) {
          return core.succeed([state, Duration.zero, decision])
        }
        return core.succeed(
          [
            state,
            Duration.millis(Intervals.start(decision.intervals) - now),
            decision
          ]
        )
      })
    ))

/** @internal */
export const mapBoth = dual<
  <In, Out, In2, Out2>(
    options: {
      readonly onInput: (in2: In2) => In
      readonly onOutput: (out: Out) => Out2
    }
  ) => <Env>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In2, Out2>,
  <Env, In, Out, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    options: {
      readonly onInput: (in2: In2) => In
      readonly onOutput: (out: Out) => Out2
    }
  ) => Schedule.Schedule<Env, In2, Out2>
>(2, (self, { onInput, onOutput }) => map(mapInput(self, onInput), onOutput))

/** @internal */
export const mapBothEffect = dual<
  <In2, Env2, In, Out, Env3, Out2>(
    options: {
      readonly onInput: (input: In2) => Effect.Effect<Env2, never, In>
      readonly onOutput: (out: Out) => Effect.Effect<Env3, never, Out2>
    }
  ) => <Env>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2 | Env3, In2, Out2>,
  <Env, In, Out, In2, Env2, Env3, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    options: {
      readonly onInput: (input: In2) => Effect.Effect<Env2, never, In>
      readonly onOutput: (out: Out) => Effect.Effect<Env3, never, Out2>
    }
  ) => Schedule.Schedule<Env | Env2 | Env3, In2, Out2>
>(2, (self, { onInput, onOutput }) => mapEffect(mapInputEffect(self, onInput), onOutput))

/** @internal */
export const driver = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>
): Effect.Effect<never, never, Schedule.ScheduleDriver<Env, In, Out>> =>
  pipe(
    ref.make<readonly [Option.Option<Out>, any]>([Option.none(), self.initial]),
    core.map((ref) => new ScheduleDriverImpl(self, ref))
  )

/** @internal */
export const duration = (
  durationInput: Duration.DurationInput
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  const duration = Duration.decode(durationInput)
  const durationMillis = Duration.toMillis(duration)
  return makeWithState(true as boolean, (now, _, state) =>
    core.succeed(
      state
        ? [
          false,
          duration,
          ScheduleDecision.continueWith(Interval.after(now + durationMillis))
        ] as const
        : [false, Duration.zero, ScheduleDecision.done] as const
    ))
}

/** @internal */
export const either = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >
>(2, (self, that) => union(self, that))

/** @internal */
export const eitherWith = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >
>(3, (self, that, f) => unionWith(self, that, f))

/** @internal */
export const ensuring = dual<
  <X>(
    finalizer: Effect.Effect<never, never, X>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out, X>(
    self: Schedule.Schedule<Env, In, Out>,
    finalizer: Effect.Effect<never, never, X>
  ) => Schedule.Schedule<Env, In, Out>
>(2, (self, finalizer) =>
  makeWithState(
    self.initial,
    (now, input, state) =>
      core.flatMap(self.step(now, input, state), ([state, out, decision]) =>
        ScheduleDecision.isDone(decision)
          ? core.as(finalizer, [state, out, decision as ScheduleDecision.ScheduleDecision] as const)
          : core.succeed([state, out, decision] as const))
  ))

/** @internal */
export const exponential = (
  baseInput: Duration.DurationInput,
  factor = 2.0
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  const base = Duration.decode(baseInput)
  return delayedSchedule(map(forever, (i) => Duration.times(base, Math.pow(factor, i))))
}

/** @internal */
export const fibonacci = (oneInput: Duration.DurationInput): Schedule.Schedule<never, unknown, Duration.Duration> => {
  const one = Duration.decode(oneInput)
  return delayedSchedule(
    pipe(
      unfold(
        [one, one] as const,
        ([a, b]) => [b, Duration.sum(a, b)] as const
      ),
      map((out) => out[0])
    )
  )
}

/** @internal */
export const fixed = (intervalInput: Duration.DurationInput): Schedule.Schedule<never, unknown, number> => {
  const interval = Duration.decode(intervalInput)
  const intervalMillis = Duration.toMillis(interval)
  return makeWithState<[Option.Option<[number, number]>, number], never, unknown, number>(
    [Option.none(), 0],
    (now, _, [option, n]) =>
      core.sync(() => {
        switch (option._tag) {
          case "None": {
            return [
              [Option.some([now, now + intervalMillis]), n + 1],
              n,
              ScheduleDecision.continueWith(Interval.after(now + intervalMillis))
            ]
          }
          case "Some": {
            const [startMillis, lastRun] = option.value
            const runningBehind = now > (lastRun + intervalMillis)
            const boundary = Equal.equals(interval, Duration.zero)
              ? interval
              : Duration.millis(intervalMillis - ((now - startMillis) % intervalMillis))
            const sleepTime = Equal.equals(boundary, Duration.zero) ? interval : boundary
            const nextRun = runningBehind ? now : now + Duration.toMillis(sleepTime)
            return [
              [Option.some([startMillis, nextRun]), n + 1],
              n,
              ScheduleDecision.continueWith(Interval.after(nextRun))
            ]
          }
        }
      })
  )
}

/** @internal */
export const fromDelay = (delay: Duration.DurationInput): Schedule.Schedule<never, unknown, Duration.Duration> =>
  duration(delay)

/** @internal */
export const fromDelays = (
  delay: Duration.DurationInput,
  ...delays: Array<Duration.DurationInput>
): Schedule.Schedule<never, unknown, Duration.Duration> =>
  makeWithState(
    [[delay, ...delays].map((_) => Duration.decode(_)) as Array<Duration.Duration>, true as boolean] as const,
    (now, _, [durations, cont]) =>
      core.sync(() => {
        if (cont) {
          const x = durations[0]!
          const interval = Interval.after(now + Duration.toMillis(x))
          if (durations.length >= 2) {
            return [
              [durations.slice(1), true] as const,
              x,
              ScheduleDecision.continueWith(interval)
            ] as const
          }
          const y = durations.slice(1)
          return [
            [[x, ...y] as Array<Duration.Duration>, false] as const,
            x,
            ScheduleDecision.continueWith(interval)
          ] as const
        }
        return [[durations, false] as const, Duration.zero, ScheduleDecision.done] as const
      })
  )

/** @internal */
export const fromFunction = <A, B>(f: (a: A) => B): Schedule.Schedule<never, A, B> => map(identity<A>(), f)

/** @internal */
export const hourOfDay = (hour: number): Schedule.Schedule<never, unknown, number> =>
  makeWithState<[number, number], never, unknown, number>(
    [Number.NEGATIVE_INFINITY, 0],
    (now, _, state) => {
      if (!Number.isInteger(hour) || hour < 0 || 23 < hour) {
        return core.dieSync(() =>
          new core.IllegalArgumentException(
            `Invalid argument in: hourOfDay(${hour}). Must be in range 0...23`
          )
        )
      }
      const n = state[1]
      const initial = n === 0
      const hour0 = nextHour(now, hour, initial)
      const start = beginningOfHour(hour0)
      const end = endOfHour(hour0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1],
          n,
          ScheduleDecision.continueWith(interval)
        ]
      )
    }
  )

/** @internal */
export const identity = <A>(): Schedule.Schedule<never, A, A> =>
  makeWithState(void 0, (now, input, state) =>
    core.succeed(
      [
        state,
        input,
        ScheduleDecision.continueWith(Interval.after(now))
      ] as const
    ))

/** @internal */
export const intersect = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >
>(2, (self, that) => intersectWith(self, that, Intervals.intersect))

/** @internal */
export const intersectWith = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >
>(3, <Env, In, Out, Env2, In2, Out2>(
  self: Schedule.Schedule<Env, In, Out>,
  that: Schedule.Schedule<Env2, In2, Out2>,
  f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
): Schedule.Schedule<
  Env | Env2,
  In & In2,
  [Out, Out2]
> =>
  makeWithState<[any, any], Env | Env2, In & In2, [Out, Out2]>(
    [self.initial, that.initial],
    (now, input: In & In2, state) =>
      pipe(
        core.zipWith(
          self.step(now, input, state[0]),
          that.step(now, input, state[1]),
          (a, b) => [a, b] as const
        ),
        core.flatMap(([
          [lState, out, lDecision],
          [rState, out2, rDecision]
        ]) => {
          if (ScheduleDecision.isContinue(lDecision) && ScheduleDecision.isContinue(rDecision)) {
            return intersectWithLoop(
              self,
              that,
              input,
              lState,
              out,
              lDecision.intervals,
              rState,
              out2,
              rDecision.intervals,
              f
            )
          }
          return core.succeed(
            [
              [lState, rState],
              [out, out2],
              ScheduleDecision.done
            ]
          )
        })
      )
  ))

/** @internal */
const intersectWithLoop = <State, State1, Env, In, Out, Env1, In1, Out2>(
  self: Schedule.Schedule<Env, In, Out>,
  that: Schedule.Schedule<Env1, In1, Out2>,
  input: In & In1,
  lState: State,
  out: Out,
  lInterval: Intervals.Intervals,
  rState: State1,
  out2: Out2,
  rInterval: Intervals.Intervals,
  f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
): Effect.Effect<
  Env | Env1,
  never,
  [[State, State1], [Out, Out2], ScheduleDecision.ScheduleDecision]
> => {
  const combined = f(lInterval, rInterval)
  if (Intervals.isNonEmpty(combined)) {
    return core.succeed([
      [lState, rState],
      [out, out2],
      ScheduleDecision.continue(combined)
    ])
  }

  if (pipe(lInterval, Intervals.lessThan(rInterval))) {
    return core.flatMap(self.step(Intervals.end(lInterval), input, lState), ([lState, out, decision]) => {
      if (ScheduleDecision.isDone(decision)) {
        return core.succeed([
          [lState, rState],
          [out, out2],
          ScheduleDecision.done
        ])
      }
      return intersectWithLoop(
        self,
        that,
        input,
        lState,
        out,
        decision.intervals,
        rState,
        out2,
        rInterval,
        f
      )
    })
  }
  return core.flatMap(that.step(Intervals.end(rInterval), input, rState), ([rState, out2, decision]) => {
    if (ScheduleDecision.isDone(decision)) {
      return core.succeed([
        [lState, rState],
        [out, out2],
        ScheduleDecision.done
      ])
    }
    return intersectWithLoop(
      self,
      that,
      input,
      lState,
      out,
      lInterval,
      rState,
      out2,
      decision.intervals,
      f
    )
  })
}

/** @internal */
export const jittered = <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> =>
  jitteredWith(self, { min: 0.8, max: 1.2 })

/** @internal */
export const jitteredWith = dual<
  (options: { min?: number; max?: number }) => <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    options: { min?: number; max?: number }
  ) => Schedule.Schedule<Env, In, Out>
>(2, (self, options) => {
  const { max, min } = Object.assign({ min: 0.8, max: 1.2 }, options)
  return delayedEffect(self, (duration) =>
    core.map(Random.next, (random) => {
      const d = Duration.toMillis(duration)
      const jittered = d * min * (1 - random) + d * max * random
      return Duration.millis(jittered)
    }))
})

/** @internal */
export const linear = (baseInput: Duration.DurationInput): Schedule.Schedule<never, unknown, Duration.Duration> => {
  const base = Duration.decode(baseInput)
  return delayedSchedule(map(forever, (i) => Duration.times(base, i + 1)))
}

/** @internal */
export const map = dual<
  <Out, Out2>(
    f: (out: Out) => Out2
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out2>,
  <Env, In, Out, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: Out) => Out2
  ) => Schedule.Schedule<Env, In, Out2>
>(2, (self, f) => mapEffect(self, (out) => core.sync(() => f(out))))

/** @internal */
export const mapEffect = dual<
  <Out, Env2, Out2>(
    f: (out: Out) => Effect.Effect<Env2, never, Out2>
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out2>,
  <Env, In, Out, Env2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: Out) => Effect.Effect<Env2, never, Out2>
  ) => Schedule.Schedule<Env | Env2, In, Out2>
>(2, (self, f) =>
  makeWithState(
    self.initial,
    (now, input, state) =>
      core.flatMap(self.step(now, input, state), ([state, out, decision]) =>
        core.map(
          f(out),
          (out2) => [state, out2, decision] as const
        ))
  ))

/** @internal */
export const minuteOfHour = (minute: number): Schedule.Schedule<never, unknown, number> =>
  makeWithState<[number, number], never, unknown, number>(
    [Number.MIN_SAFE_INTEGER, 0],
    (now, _, state) => {
      if (!Number.isInteger(minute) || minute < 0 || 59 < minute) {
        return core.dieSync(() =>
          new core.IllegalArgumentException(
            `Invalid argument in: minuteOfHour(${minute}). Must be in range 0...59`
          )
        )
      }
      const n = state[1]
      const initial = n === 0
      const minute0 = nextMinute(now, minute, initial)
      const start = beginningOfMinute(minute0)
      const end = endOfMinute(minute0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1],
          n,
          ScheduleDecision.continueWith(interval)
        ]
      )
    }
  )

/** @internal */
export const modifyDelay = dual<
  <Out>(
    f: (out: Out, duration: Duration.Duration) => Duration.DurationInput
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: Out, duration: Duration.Duration) => Duration.DurationInput
  ) => Schedule.Schedule<Env, In, Out>
>(2, (self, f) => modifyDelayEffect(self, (out, duration) => core.sync(() => f(out, duration))))

/** @internal */
export const modifyDelayEffect = dual<
  <Out, Env2>(
    f: (out: Out, duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.DurationInput>
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out>,
  <Env, In, Out, Env2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: Out, duration: Duration.Duration) => Effect.Effect<Env2, never, Duration.DurationInput>
  ) => Schedule.Schedule<Env | Env2, In, Out>
>(2, (self, f) =>
  makeWithState(
    self.initial,
    (now, input, state) =>
      core.flatMap(self.step(now, input, state), ([state, out, decision]) => {
        if (ScheduleDecision.isDone(decision)) {
          return core.succeed([state, out, decision] as const)
        }
        const intervals = decision.intervals
        const delay = Interval.size(Interval.make(now, Intervals.start(intervals)))
        return core.map(f(out, delay), (durationInput) => {
          const duration = Duration.decode(durationInput)
          const oldStart = Intervals.start(intervals)
          const newStart = now + Duration.toMillis(duration)
          const delta = newStart - oldStart
          const newEnd = Math.min(Math.max(0, Intervals.end(intervals) + delta), Number.MAX_SAFE_INTEGER)
          const newInterval = Interval.make(newStart, newEnd)
          return [state, out, ScheduleDecision.continueWith(newInterval)] as const
        })
      })
  ))

/** @internal */
export const onDecision = dual<
  <Out, Env2, X>(
    f: (out: Out, decision: ScheduleDecision.ScheduleDecision) => Effect.Effect<Env2, never, X>
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out>,
  <Env, In, Out, Env2, X>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: Out, decision: ScheduleDecision.ScheduleDecision) => Effect.Effect<Env2, never, X>
  ) => Schedule.Schedule<Env | Env2, In, Out>
>(2, (self, f) =>
  makeWithState(
    self.initial,
    (now, input, state) =>
      core.flatMap(
        self.step(now, input, state),
        ([state, out, decision]) => core.as(f(out, decision), [state, out, decision] as const)
      )
  ))

/** @internal */
export const passthrough = <Env, Input, Output>(
  self: Schedule.Schedule<Env, Input, Output>
): Schedule.Schedule<Env, Input, Input> =>
  makeWithState(self.initial, (now, input, state) =>
    pipe(
      self.step(now, input, state),
      core.map(([state, _, decision]) => [state, input, decision] as const)
    ))

/** @internal */
export const provideContext = dual<
  <Env>(
    context: Context.Context<Env>
  ) => <In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<never, In, Out>,
  <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    context: Context.Context<Env>
  ) => Schedule.Schedule<never, In, Out>
>(2, (self, context) =>
  makeWithState(self.initial, (now, input, state) =>
    core.provideContext(
      self.step(now, input, state),
      context
    )))

/** @internal */
export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ) => <R, In, Out>(
    self: Schedule.Schedule<R, In, Out>
  ) => Schedule.Schedule<Exclude<R, Context.Tag.Identifier<T>>, In, Out>,
  <R, In, Out, T extends Context.Tag<any, any>>(
    self: Schedule.Schedule<R, In, Out>,
    tag: T,
    service: Context.Tag.Service<T>
  ) => Schedule.Schedule<Exclude<R, Context.Tag.Identifier<T>>, In, Out>
>(3, <R, In, Out, T extends Context.Tag<any, any>>(
  self: Schedule.Schedule<R, In, Out>,
  tag: T,
  service: Context.Tag.Service<T>
): Schedule.Schedule<Exclude<R, Context.Tag.Identifier<T>>, In, Out> =>
  makeWithState(self.initial, (now, input, state) =>
    core.contextWithEffect<
      Exclude<R, Context.Tag.Identifier<T>>,
      Exclude<R, Context.Tag.Identifier<T>>,
      never,
      readonly [any, Out, ScheduleDecision.ScheduleDecision]
    >((env) =>
      core.provideContext(
        // @ts-expect-error
        self.step(now, input, state),
        Context.add(env, tag, service)
      )
    )))

/** @internal */
export const recurUntil = <A>(f: Predicate<A>): Schedule.Schedule<never, A, A> => untilInput(identity<A>(), f)

/** @internal */
export const recurUntilEffect = <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
): Schedule.Schedule<Env, A, A> => untilInputEffect(identity<A>(), f)

/** @internal */
export const recurUntilOption = <A, B>(pf: (a: A) => Option.Option<B>): Schedule.Schedule<never, A, Option.Option<B>> =>
  untilOutput(map(identity<A>(), pf), Option.isSome)

/** @internal */
export const recurUpTo = (
  durationInput: Duration.DurationInput
): Schedule.Schedule<never, unknown, Duration.Duration> => {
  const duration = Duration.decode(durationInput)
  return whileOutput(elapsed, (elapsed) => Duration.lessThan(elapsed, duration))
}

/** @internal */
export const recurWhile = <A>(f: Predicate<A>): Schedule.Schedule<never, A, A> => whileInput(identity<A>(), f)

/** @internal */
export const recurWhileEffect = <Env, A>(
  f: (a: A) => Effect.Effect<Env, never, boolean>
): Schedule.Schedule<Env, A, A> => whileInputEffect(identity<A>(), f)

/** @internal */
export const recurs = (n: number): Schedule.Schedule<never, unknown, number> => whileOutput(forever, (out) => out < n)

/** @internal */
export const reduce = dual<
  <Out, Z>(
    zero: Z,
    f: (z: Z, out: Out) => Z
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Z>,
  <Env, In, Out, Z>(
    self: Schedule.Schedule<Env, In, Out>,
    zero: Z,
    f: (z: Z, out: Out) => Z
  ) => Schedule.Schedule<Env, In, Z>
>(3, (self, zero, f) => reduceEffect(self, zero, (z, out) => core.sync(() => f(z, out))))

/** @internal */
export const reduceEffect = dual<
  <Out, Env1, Z>(
    zero: Z,
    f: (z: Z, out: Out) => Effect.Effect<Env1, never, Z>
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env1, In, Z>,
  <Env, In, Out, Env1, Z>(
    self: Schedule.Schedule<Env, In, Out>,
    zero: Z,
    f: (z: Z, out: Out) => Effect.Effect<Env1, never, Z>
  ) => Schedule.Schedule<Env | Env1, In, Z>
>(3, (self, zero, f) =>
  makeWithState(
    [self.initial, zero] as const,
    (now, input, [s, z]) =>
      core.flatMap(self.step(now, input, s), ([s, out, decision]) =>
        ScheduleDecision.isDone(decision)
          ? core.succeed([[s, z], z, decision as ScheduleDecision.ScheduleDecision] as const)
          : core.map(f(z, out), (z2) => [[s, z2], z, decision] as const))
  ))

/** @internal */
export const repeatForever = <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, Out> =>
  makeWithState(self.initial, (now, input, state) => {
    const step = (
      now: number,
      input: In,
      state: any
    ): Effect.Effect<Env, never, [any, Out, ScheduleDecision.ScheduleDecision]> =>
      core.flatMap(
        self.step(now, input, state),
        ([state, out, decision]) =>
          ScheduleDecision.isDone(decision)
            ? step(now, input, self.initial)
            : core.succeed([state, out, decision])
      )
    return step(now, input, state)
  })

/** @internal */
export const repetitions = <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>): Schedule.Schedule<Env, In, number> =>
  reduce(self, 0, (n, _) => n + 1)

/** @internal */
export const resetAfter = dual<
  (
    duration: Duration.DurationInput
  ) => <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    duration: Duration.DurationInput
  ) => Schedule.Schedule<Env, In, Out>
>(2, (self, durationInput) => {
  const duration = Duration.decode(durationInput)
  return pipe(
    self,
    intersect(elapsed),
    resetWhen(([, time]) => Duration.greaterThanOrEqualTo(time, duration)),
    map((out) => out[0])
  )
})

/** @internal */
export const resetWhen = dual<
  <Out>(f: Predicate<Out>) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>, f: Predicate<Out>) => Schedule.Schedule<Env, In, Out>
>(2, (self, f) =>
  makeWithState(
    self.initial,
    (now, input, state) =>
      core.flatMap(self.step(now, input, state), ([state, out, decision]) =>
        f(out)
          ? self.step(now, input, self.initial)
          : core.succeed([state, out, decision] as const))
  ))

/** @internal */
export const run = dual<
  <In>(
    now: number,
    input: Iterable<In>
  ) => <Env, Out>(self: Schedule.Schedule<Env, In, Out>) => Effect.Effect<Env, never, Chunk.Chunk<Out>>,
  <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    now: number,
    input: Iterable<In>
  ) => Effect.Effect<Env, never, Chunk.Chunk<Out>>
>(3, (self, now, input) =>
  pipe(
    runLoop(self, now, Chunk.fromIterable(input), self.initial, Chunk.empty()),
    core.map((list) => Chunk.reverse(list))
  ))

/** @internal */
const runLoop = <Env, In, Out>(
  self: Schedule.Schedule<Env, In, Out>,
  now: number,
  inputs: Chunk.Chunk<In>,
  state: any,
  acc: Chunk.Chunk<Out>
): Effect.Effect<Env, never, Chunk.Chunk<Out>> => {
  if (!Chunk.isNonEmpty(inputs)) {
    return core.succeed(acc)
  }
  const input = Chunk.headNonEmpty(inputs)
  const nextInputs = Chunk.tailNonEmpty(inputs)
  return core.flatMap(self.step(now, input, state), ([state, out, decision]) => {
    if (ScheduleDecision.isDone(decision)) {
      return core.sync(() => pipe(acc, Chunk.prepend(out)))
    }
    return runLoop(
      self,
      Intervals.start(decision.intervals),
      nextInputs,
      state,
      Chunk.prepend(acc, out)
    )
  })
}

/** @internal */
export const secondOfMinute = (second: number): Schedule.Schedule<never, unknown, number> =>
  makeWithState<[number, number], never, unknown, number>(
    [Number.NEGATIVE_INFINITY, 0],
    (now, _, state) => {
      if (!Number.isInteger(second) || second < 0 || 59 < second) {
        return core.dieSync(() =>
          new core.IllegalArgumentException(
            `Invalid argument in: secondOfMinute(${second}). Must be in range 0...59`
          )
        )
      }
      const n = state[1]
      const initial = n === 0
      const second0 = nextSecond(now, second, initial)
      const start = beginningOfSecond(second0)
      const end = endOfSecond(second0)
      const interval = Interval.make(start, end)
      return core.succeed(
        [
          [end, n + 1],
          n,
          ScheduleDecision.continueWith(interval)
        ]
      )
    }
  )

/** @internal */
export const spaced = (duration: Duration.DurationInput): Schedule.Schedule<never, unknown, number> =>
  addDelay(forever, () => duration)

/** @internal */
export const succeed = <A>(value: A): Schedule.Schedule<never, unknown, A> => map(forever, () => value)

/** @internal */
export const sync = <A>(evaluate: LazyArg<A>): Schedule.Schedule<never, unknown, A> => map(forever, evaluate)

/** @internal */
export const tapInput = dual<
  <Env2, In2, X>(
    f: (input: In2) => Effect.Effect<Env2, never, X>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In & In2, Out>,
  <Env, In, Out, Env2, In2, X>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (input: In2) => Effect.Effect<Env2, never, X>
  ) => Schedule.Schedule<Env | Env2, In & In2, Out>
>(2, (self, f) =>
  makeWithState(self.initial, (now, input, state) =>
    core.zipRight(
      f(input),
      self.step(now, input, state)
    )))

/** @internal */
export const tapOutput = dual<
  <Out, XO extends Out, Env2, X>(
    f: (out: XO) => Effect.Effect<Env2, never, X>
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out>,
  <Env, In, Out, XO extends Out, Env2, X>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: XO) => Effect.Effect<Env2, never, X>
  ) => Schedule.Schedule<Env | Env2, In, Out>
>(2, (self, f) =>
  makeWithState(self.initial, (now, input, state) =>
    core.tap(
      self.step(now, input, state),
      ([, out]) => f(out as any)
    )))

/** @internal */
export const unfold = <A>(initial: A, f: (a: A) => A): Schedule.Schedule<never, unknown, A> =>
  makeWithState(initial, (now, _, state) =>
    core.sync(() =>
      [
        f(state),
        state,
        ScheduleDecision.continueWith(Interval.after(now))
      ] as const
    ))

/** @internal */
export const union = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >
>(2, (self, that) => unionWith(self, that, Intervals.union))

/** @internal */
export const unionWith = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>,
    f: (x: Intervals.Intervals, y: Intervals.Intervals) => Intervals.Intervals
  ) => Schedule.Schedule<
    Env | Env2,
    In & In2,
    [Out, Out2]
  >
>(3, (self, that, f) =>
  makeWithState([self.initial, that.initial], (now, input, state) =>
    core.zipWith(
      self.step(now, input, state[0]),
      that.step(now, input, state[1]),
      ([lState, l, lDecision], [rState, r, rDecision]) => {
        if (ScheduleDecision.isDone(lDecision) && ScheduleDecision.isDone(rDecision)) {
          return [[lState, rState], [l, r], ScheduleDecision.done]
        }
        if (ScheduleDecision.isDone(lDecision) && ScheduleDecision.isContinue(rDecision)) {
          return [
            [lState, rState],
            [l, r],
            ScheduleDecision.continue(rDecision.intervals)
          ]
        }
        if (ScheduleDecision.isContinue(lDecision) && ScheduleDecision.isDone(rDecision)) {
          return [
            [lState, rState],
            [l, r],
            ScheduleDecision.continue(lDecision.intervals)
          ]
        }
        if (ScheduleDecision.isContinue(lDecision) && ScheduleDecision.isContinue(rDecision)) {
          const combined = f(lDecision.intervals, rDecision.intervals)
          return [
            [lState, rState],
            [l, r],
            ScheduleDecision.continue(combined)
          ]
        }
        throw new Error(
          "BUG: Schedule.unionWith - please report an issue at https://github.com/Effect-TS/effect/issues"
        )
      }
    )))

/** @internal */
export const untilInput = dual<
  <In>(f: Predicate<In>) => <Env, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>, f: Predicate<In>) => Schedule.Schedule<Env, In, Out>
>(2, (self, f) => check(self, (input, _) => !f(input)))

/** @internal */
export const untilInputEffect = dual<
  <In, Env2>(
    f: (input: In) => Effect.Effect<Env2, never, boolean>
  ) => <Env, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out>,
  <Env, In, Out, Env2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (input: In) => Effect.Effect<Env2, never, boolean>
  ) => Schedule.Schedule<Env | Env2, In, Out>
>(2, (self, f) => checkEffect(self, (input, _) => effect.negate(f(input))))

/** @internal */
export const untilOutput = dual<
  <Out>(f: Predicate<Out>) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>, f: Predicate<Out>) => Schedule.Schedule<Env, In, Out>
>(2, (self, f) => check(self, (_, out) => !f(out)))

/** @internal */
export const untilOutputEffect = dual<
  <Out, Env2>(
    f: (out: Out) => Effect.Effect<Env2, never, boolean>
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out>,
  <Env, In, Out, Env2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: Out) => Effect.Effect<Env2, never, boolean>
  ) => Schedule.Schedule<Env | Env2, In, Out>
>(2, (self, f) => checkEffect(self, (_, out) => effect.negate(f(out))))

/** @internal */
export const upTo = dual<
  (duration: Duration.DurationInput) => <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>
  ) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(
    self: Schedule.Schedule<Env, In, Out>,
    duration: Duration.DurationInput
  ) => Schedule.Schedule<Env, In, Out>
>(2, (self, duration) => zipLeft(self, recurUpTo(duration)))

/** @internal */
export const whileInput = dual<
  <In>(f: Predicate<In>) => <Env, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>, f: Predicate<In>) => Schedule.Schedule<Env, In, Out>
>(2, (self, f) => check(self, (input, _) => f(input)))

/** @internal */
export const whileInputEffect = dual<
  <In, Env2>(
    f: (input: In) => Effect.Effect<Env2, never, boolean>
  ) => <Env, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In, Out>,
  <Env, In, Out, Env2>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (input: In) => Effect.Effect<Env2, never, boolean>
  ) => Schedule.Schedule<Env | Env2, In, Out>
>(2, (self, f) => checkEffect(self, (input, _) => f(input)))

/** @internal */
export const whileOutput = dual<
  <Out>(f: Predicate<Out>) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env, In, Out>,
  <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>, f: Predicate<Out>) => Schedule.Schedule<Env, In, Out>
>(2, (self, f) => check(self, (_, out) => f(out)))

/** @internal */
export const whileOutputEffect = dual<
  <Out, Env1>(
    f: (out: Out) => Effect.Effect<Env1, never, boolean>
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env1, In, Out>,
  <Env, In, Out, Env1>(
    self: Schedule.Schedule<Env, In, Out>,
    f: (out: Out) => Effect.Effect<Env1, never, boolean>
  ) => Schedule.Schedule<Env | Env1, In, Out>
>(2, (self, f) => checkEffect(self, (_, out) => f(out)))

/** @internal */
export const windowed = (intervalInput: Duration.DurationInput): Schedule.Schedule<never, unknown, number> => {
  const interval = Duration.decode(intervalInput)
  const millis = Duration.toMillis(interval)
  return makeWithState<[Option.Option<number>, number], never, unknown, number>(
    [Option.none(), 0],
    (now, _, [option, n]) => {
      switch (option._tag) {
        case "None": {
          return core.succeed(
            [
              [Option.some(now), n + 1],
              n,
              ScheduleDecision.continueWith(Interval.after(now + millis))
            ]
          )
        }
        case "Some": {
          return core.succeed(
            [
              [Option.some(option.value), n + 1],
              n,
              ScheduleDecision.continueWith(
                Interval.after(now + (millis - ((now - option.value) % millis)))
              )
            ]
          )
        }
      }
    }
  )
}

/** @internal */
export const zipLeft = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In & In2, Out>,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => Schedule.Schedule<Env | Env2, In & In2, Out>
>(2, (self, that) => map(intersect(self, that), (out) => out[0]))

/** @internal */
export const zipRight = dual<
  <Env2, In2, Out2>(
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => <Env, In, Out>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In & In2, Out2>,
  <Env, In, Out, Env2, In2, Out2>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>
  ) => Schedule.Schedule<Env | Env2, In & In2, Out2>
>(2, (self, that) => map(intersect(self, that), (out) => out[1]))

/** @internal */
export const zipWith = dual<
  <Env2, In2, Out2, Out, Out3>(
    that: Schedule.Schedule<Env2, In2, Out2>,
    f: (out: Out, out2: Out2) => Out3
  ) => <Env, In>(self: Schedule.Schedule<Env, In, Out>) => Schedule.Schedule<Env | Env2, In & In2, Out3>,
  <Env, In, Out, Env2, In2, Out2, Out3>(
    self: Schedule.Schedule<Env, In, Out>,
    that: Schedule.Schedule<Env2, In2, Out2>,
    f: (out: Out, out2: Out2) => Out3
  ) => Schedule.Schedule<Env | Env2, In & In2, Out3>
>(3, (self, that, f) => map(intersect(self, that), ([out, out2]) => f(out, out2)))

// -----------------------------------------------------------------------------
// Seconds
// -----------------------------------------------------------------------------

/** @internal */
export const beginningOfSecond = (now: number): number => {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    0
  ).getTime()
}

/** @internal */
export const endOfSecond = (now: number): number => {
  const date = new Date(beginningOfSecond(now))
  return date.setSeconds(date.getSeconds() + 1)
}

/** @internal */
export const nextSecond = (now: number, second: number, initial: boolean): number => {
  const date = new Date(now)
  if (date.getSeconds() === second && initial) {
    return now
  }
  if (date.getSeconds() < second) {
    return date.setSeconds(second)
  }
  // Set seconds to the provided value and add one minute
  const newDate = new Date(date.setSeconds(second))
  return newDate.setTime(newDate.getTime() + 1000 * 60)
}

// -----------------------------------------------------------------------------
// Minutes
// -----------------------------------------------------------------------------

/** @internal */
export const beginningOfMinute = (now: number): number => {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    0,
    0
  ).getTime()
}

/** @internal */
export const endOfMinute = (now: number): number => {
  const date = new Date(beginningOfMinute(now))
  return date.setMinutes(date.getMinutes() + 1)
}

/** @internal */
export const nextMinute = (now: number, minute: number, initial: boolean): number => {
  const date = new Date(now)
  if (date.getMinutes() === minute && initial) {
    return now
  }
  if (date.getMinutes() < minute) {
    return date.setMinutes(minute)
  }
  // Set minutes to the provided value and add one hour
  const newDate = new Date(date.setMinutes(minute))
  return newDate.setTime(newDate.getTime() + 1000 * 60 * 60)
}

// -----------------------------------------------------------------------------
// Hours
// -----------------------------------------------------------------------------

/** @internal */
export const beginningOfHour = (now: number): number => {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    0,
    0,
    0
  ).getTime()
}

/** @internal */
export const endOfHour = (now: number): number => {
  const date = new Date(beginningOfHour(now))
  return date.setHours(date.getHours() + 1)
}

/** @internal */
export const nextHour = (now: number, hour: number, initial: boolean): number => {
  const date = new Date(now)
  if (date.getHours() === hour && initial) {
    return now
  }
  if (date.getHours() < hour) {
    return date.setHours(hour)
  }
  // Set hours to the provided value and add one day
  const newDate = new Date(date.setHours(hour))
  return newDate.setTime(newDate.getTime() + 1000 * 60 * 60 * 24)
}

// -----------------------------------------------------------------------------
// Days
// -----------------------------------------------------------------------------

/** @internal */
export const beginningOfDay = (now: number): number => {
  const date = new Date(now)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  ).getTime()
}

/** @internal */
export const endOfDay = (now: number): number => {
  const date = new Date(beginningOfDay(now))
  return date.setDate(date.getDate() + 1)
}

/** @internal */
export const nextDay = (now: number, dayOfWeek: number, initial: boolean): number => {
  const date = new Date(now)
  if (date.getDay() === dayOfWeek && initial) {
    return now
  }
  const nextDayOfWeek = (7 + dayOfWeek - date.getDay()) % 7
  return date.setDate(date.getDate() + (nextDayOfWeek === 0 ? 7 : nextDayOfWeek))
}

/** @internal */
export const nextDayOfMonth = (now: number, day: number, initial: boolean): number => {
  const date = new Date(now)
  if (date.getDate() === day && initial) {
    return now
  }
  if (date.getDate() < day) {
    return date.setDate(day)
  }
  return findNextMonth(now, day, 1)
}

/** @internal */
export const findNextMonth = (now: number, day: number, months: number): number => {
  const d = new Date(now)
  const tmp1 = new Date(d.setDate(day))
  const tmp2 = new Date(tmp1.setMonth(tmp1.getMonth() + months))
  if (tmp2.getDate() === day) {
    const d2 = new Date(now)
    const tmp3 = new Date(d2.setDate(day))
    return tmp3.setMonth(tmp3.getMonth() + months)
  }
  return findNextMonth(now, day, months + 1)
}

// circular with Effect

/** @internal */
export const repeat_Effect = dual<
  <R1, A extends A0, A0, B>(
    schedule: Schedule.Schedule<R1, A, B>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E, B>,
  <R, E, A extends A0, A0, R1, B>(
    self: Effect.Effect<R, E, A>,
    schedule: Schedule.Schedule<R1, A0, B>
  ) => Effect.Effect<R | R1, E, B>
>(2, (self, schedule) => repeatOrElse_Effect(self, schedule, (e, _) => core.fail(e)))

/** @internal */
export const repeatOrElse_Effect = dual<
  <R2, A extends A0, A0, B, E, R3, E2>(
    schedule: Schedule.Schedule<R2, A, B>,
    orElse: (error: E, option: Option.Option<B>) => Effect.Effect<R3, E2, B>
  ) => <R>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2 | R3, E2, B>,
  <R, E, A extends A0, A0, R2, B, R3, E2>(
    self: Effect.Effect<R, E, A>,
    schedule: Schedule.Schedule<R2, A0, B>,
    orElse: (error: E, option: Option.Option<B>) => Effect.Effect<R3, E2, B>
  ) => Effect.Effect<R | R2 | R3, E2, B>
>(3, (self, schedule, orElse) =>
  core.flatMap(driver(schedule), (driver) =>
    core.matchEffect(self, {
      onFailure: (error) => orElse(error, Option.none()),
      onSuccess: (value) => repeatOrElseEffectLoop(self, driver, orElse, value)
    })))

/** @internal */
const repeatOrElseEffectLoop = <R, E, A extends A0, A0, R1, B, R2, E2, C>(
  self: Effect.Effect<R, E, A>,
  driver: Schedule.ScheduleDriver<R1, A0, B>,
  orElse: (error: E, option: Option.Option<B>) => Effect.Effect<R2, E2, C>,
  value: A
): Effect.Effect<R | R1 | R2, E2, B | C> => {
  return core.matchEffect(driver.next(value), {
    onFailure: () => core.orDie(driver.last),
    onSuccess: (b) =>
      core.matchEffect(self, {
        onFailure: (error) => orElse(error, Option.some(b)),
        onSuccess: (value) => repeatOrElseEffectLoop(self, driver, orElse, value)
      })
  })
}

/** @internal */
export const repeatUntil_Effect = dual<
  {
    <A, B extends A>(f: Refinement<A, B>): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
    <A>(f: Predicate<A>): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  },
  {
    <R, E, A, B extends A>(self: Effect.Effect<R, E, A>, f: Predicate<A>): Effect.Effect<R, E, B>
    <R, E, A>(self: Effect.Effect<R, E, A>, f: Predicate<A>): Effect.Effect<R, E, A>
  }
>(
  2,
  <R, E, A>(self: Effect.Effect<R, E, A>, f: Predicate<A>) =>
    repeatUntilEffect_Effect(self, (a) => core.sync(() => f(a)))
)

/** @internal */
export const repeatUntilEffect_Effect: {
  <A, R2, E2>(
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>
  <R, E, A, R2, E2>(
    self: Effect.Effect<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): Effect.Effect<R | R2, E | E2, A>
} = dual<
  <A, R2, E2>(
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E | E2, A>,
  <R, E, A, R2, E2>(
    self: Effect.Effect<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ) => Effect.Effect<R | R2, E | E2, A>
>(2, (self, f) =>
  core.flatMap(self, (a) =>
    core.flatMap(f(a), (result) =>
      result ?
        core.succeed(a) :
        core.flatMap(
          core.yieldNow(),
          () => repeatUntilEffect_Effect(self, f)
        ))))

/** @internal */
export const repeatWhile_Effect = dual<
  <A>(f: Predicate<A>) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, f: Predicate<A>) => Effect.Effect<R, E, A>
>(2, (self, f) => repeatWhileEffect_Effect(self, (a) => core.sync(() => f(a))))

/** @internal */
export const repeatWhileEffect_Effect = dual<
  <R1, A, E2>(
    f: (a: A) => Effect.Effect<R1, E2, boolean>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E2, A>,
  <R, E, R1, A, E2>(
    self: Effect.Effect<R, E, A>,
    f: (a: A) => Effect.Effect<R1, E2, boolean>
  ) => Effect.Effect<R | R1, E | E2, A>
>(2, (self, f) => repeatUntilEffect_Effect(self, (a) => effect.negate(f(a))))

/** @internal */
export const retry_Effect = dual<
  <R1, E extends E0, E0, B>(
    policy: Schedule.Schedule<R1, E0, B>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E, A>,
  <R, E extends E0, E0, A, R1, B>(
    self: Effect.Effect<R, E, A>,
    policy: Schedule.Schedule<R1, E0, B>
  ) => Effect.Effect<R | R1, E, A>
>(2, (self, policy) => retryOrElse_Effect(self, policy, (e, _) => core.fail(e)))

/** @internal */
export const retryN_Effect = dual<
  (n: number) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, n: number) => Effect.Effect<R, E, A>
>(2, (self, n) => retryN_EffectLoop(self, n))

/** @internal */
const retryN_EffectLoop = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  n: number
): Effect.Effect<R, E, A> => {
  return core.catchAll(self, (e) =>
    n <= 0 ?
      core.fail(e) :
      core.flatMap(core.yieldNow(), () => retryN_EffectLoop(self, n - 1)))
}

/** @internal */
export const retryOrElse_Effect = dual<
  <R1, E extends E3, A1, R2, E2, A2, E3>(
    policy: Schedule.Schedule<R1, E3, A1>,
    orElse: (e: E, out: A1) => Effect.Effect<R2, E2, A2>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1 | R2, E | E2, A | A2>,
  <R, E extends E3, A, R1, A1, R2, E2, A2, E3>(
    self: Effect.Effect<R, E, A>,
    policy: Schedule.Schedule<R1, E3, A1>,
    orElse: (e: E, out: A1) => Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R1 | R2, E | E2, A | A2>
>(3, (self, policy, orElse) =>
  core.flatMap(
    driver(policy),
    (driver) => retryOrElse_EffectLoop(self, driver, orElse)
  ))

/** @internal */
const retryOrElse_EffectLoop = <R, E, A, R1, A1, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  driver: Schedule.ScheduleDriver<R1, E, A1>,
  orElse: (e: E, out: A1) => Effect.Effect<R2, E2, A2>
): Effect.Effect<R | R1 | R2, E | E2, A | A2> => {
  return core.catchAll(
    self,
    (e) =>
      core.matchEffect(driver.next(e), {
        onFailure: () =>
          pipe(
            driver.last,
            core.orDie,
            core.flatMap((out) => orElse(e, out))
          ),
        onSuccess: () => retryOrElse_EffectLoop(self, driver, orElse)
      })
  )
}

/** @internal */
export const retryUntil_Effect = dual<
  {
    <E, E2 extends E>(f: Refinement<E, E2>): <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E2, A>
    <E>(f: Predicate<E>): <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  },
  {
    <R, E, A, E2 extends E>(self: Effect.Effect<R, E, A>, f: Refinement<E, E2>): Effect.Effect<R, E2, A>
    <R, E, A>(self: Effect.Effect<R, E, A>, f: Predicate<E>): Effect.Effect<R, E, A>
  }
>(2, <R, E, A>(self: Effect.Effect<R, E, A>, f: Predicate<E>) =>
  retryUntilEffect_Effect(
    self,
    (e) => core.sync(() => f(e))
  ))

/** @internal */
export const retryUntilEffect_Effect: {
  <R1, E, E2>(
    f: (e: E) => Effect.Effect<R1, E2, boolean>
  ): <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R1 | R, E | E2, A>
  <R, E, A, R1, E2>(
    self: Effect.Effect<R, E, A>,
    f: (e: E) => Effect.Effect<R1, E2, boolean>
  ): Effect.Effect<R | R1, E | E2, A>
} = dual<
  <R1, E, E2>(
    f: (e: E) => Effect.Effect<R1, E2, boolean>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E2, A>,
  <R, E, A, R1, E2>(
    self: Effect.Effect<R, E, A>,
    f: (e: E) => Effect.Effect<R1, E2, boolean>
  ) => Effect.Effect<R | R1, E | E2, A>
>(2, (self, f) =>
  core.catchAll(self, (e) =>
    core.flatMap(f(e), (b) =>
      b ?
        core.fail(e) :
        core.flatMap(
          core.yieldNow(),
          () => retryUntilEffect_Effect(self, f)
        ))))

/** @internal */
export const retryWhile_Effect = dual<
  <E>(f: Predicate<E>) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(self: Effect.Effect<R, E, A>, f: Predicate<E>) => Effect.Effect<R, E, A>
>(2, (self, f) => retryWhileEffect_Effect(self, (e) => core.sync(() => f(e))))

/** @internal */
export const retryWhileEffect_Effect = dual<
  <R1, E, E2>(
    f: (e: E) => Effect.Effect<R1, E2, boolean>
  ) => <R, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E | E2, A>,
  <R, E, A, R1, E2>(
    self: Effect.Effect<R, E, A>,
    f: (e: E) => Effect.Effect<R1, E2, boolean>
  ) => Effect.Effect<R | R1, E | E2, A>
>(2, (self, f) => retryUntilEffect_Effect(self, (e) => effect.negate(f(e))))

/** @internal */
export const schedule_Effect = dual<
  <R2, Out>(
    schedule: Schedule.Schedule<R2, unknown, Out>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R2, E, Out>,
  <R, E, A, R2, Out>(
    self: Effect.Effect<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, Out>
  ) => Effect.Effect<R | R2, E, Out>
>(2, <R, E, A, R2, Out>(
  self: Effect.Effect<R, E, A>,
  schedule: Schedule.Schedule<R2, unknown, Out>
) => scheduleFrom_Effect(self, void 0, schedule))

/** @internal */
export const scheduleFrom_Effect = dual<
  <R2, In, Out>(
    initial: In,
    schedule: Schedule.Schedule<R2, In, Out>
  ) => <R, E>(self: Effect.Effect<R, E, In>) => Effect.Effect<R | R2, E, Out>,
  <R, E, In, R2, Out>(
    self: Effect.Effect<R, E, In>,
    initial: In,
    schedule: Schedule.Schedule<R2, In, Out>
  ) => Effect.Effect<R | R2, E, Out>
>(3, (self, initial, schedule) =>
  core.flatMap(
    driver(schedule),
    (driver) => scheduleFrom_EffectLoop(self, initial, driver)
  ))

/** @internal */
const scheduleFrom_EffectLoop = <R, E, In, R2, Out>(
  self: Effect.Effect<R, E, In>,
  initial: In,
  driver: Schedule.ScheduleDriver<R2, In, Out>
): Effect.Effect<R | R2, E, Out> =>
  core.matchEffect(driver.next(initial), {
    onFailure: () => core.orDie(driver.last),
    onSuccess: () => core.flatMap(self, (a) => scheduleFrom_EffectLoop(self, a, driver))
  })

/** @internal */
export const count: Schedule.Schedule<never, unknown, number> = unfold(0, (n) => n + 1)

/** @internal */
export const elapsed: Schedule.Schedule<never, unknown, Duration.Duration> = makeWithState(
  Option.none() as Option.Option<number>,
  (now, _, state) => {
    switch (state._tag) {
      case "None": {
        return core.succeed(
          [
            Option.some(now),
            Duration.zero,
            ScheduleDecision.continueWith(Interval.after(now))
          ] as const
        )
      }
      case "Some": {
        return core.succeed(
          [
            Option.some(state.value),
            Duration.millis(now - state.value),
            ScheduleDecision.continueWith(Interval.after(now))
          ] as const
        )
      }
    }
  }
)

/** @internal */
export const forever: Schedule.Schedule<never, unknown, number> = unfold(0, (n) => n + 1)

/** @internal */
export const once: Schedule.Schedule<never, unknown, void> = asUnit(recurs(1))

/** @internal */
export const stop: Schedule.Schedule<never, unknown, void> = asUnit(recurs(0))

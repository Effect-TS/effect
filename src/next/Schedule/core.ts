import * as A from "../../Array"
import * as E from "../../Either"
import { Either } from "../../Either"
import { Eq } from "../../Eq"
import { pipe } from "../../Function"
import * as NA from "../../NonEmptyArray"
import * as O from "../../Option"
import { currentTime, HasClock, ProxyClock } from "../Clock"
import { zipPar_ } from "../Effect/zipPar_"
import { replaceServiceIn_ } from "../Has"
import { HasRandom, nextDouble, nextIntBetween } from "../Random"
import * as R from "../Ref"

import * as T from "./effect"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay<S, R, ST, A, B>(f: (b: B) => number) {
  return (self: Schedule<S, R, ST, A, B>) => addDelayM_(self, (b) => T.succeedNow(f(b)))
}

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay_<S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  f: (b: B) => number
) {
  return addDelayM_(self, (b) => T.succeedNow(f(b)))
}

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayM<B, S1, R1>(f: (b: B) => T.Effect<S1, R1, never, number>) {
  return <S, R, ST, A>(self: Schedule<S, R, ST, A, B>) =>
    updated_(self, (update) => (a, s) =>
      T.chain_(f(self.extract(a, s)), (d) =>
        T.chain_(update(a, s), (r) => T.delay(d)(T.succeedNow(r)))
      )
    )
}

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayM_<S, R, ST, A, B, S1, R1>(
  self: Schedule<S, R, ST, A, B>,
  f: (b: B) => T.Effect<S1, R1, never, number>
) {
  return updated_(self, (update) => (a, s) =>
    T.chain_(f(self.extract(a, s)), (d) =>
      T.chain_(update(a, s), (r) => T.delay(d)(T.succeedNow(r)))
    )
  )
}

/**
 * The same as `andThenEither`, but merges the output.
 */
export function andThen<ST1, A, R1, S1, C, A1 extends A = A>(
  that: Schedule<S1, R1, ST1, A1, C>
) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => andThen_(self, that)
}

/**
 * The same as `andThenEither`, but merges the output.
 */
export function andThen_<S, R, ST, B, A, R1, ST1, S1, C, A1 extends A = A>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S1, R1, ST1, A1, C>
) {
  return map_(andThenEither_(self, that), (a) => (a._tag === "Left" ? a.left : a.right))
}

/**
 * Returns a new schedule that first executes this schedule to completion,
 * and then executes the specified schedule to completion.
 */
export function andThenEither<S1, R1, ST1, C, A2, A1 extends A2 = A2>(
  that: Schedule<S1, R1, ST1, A1, C>
) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A2, B>) => andThenEither_(self, that)
}

/**
 * Returns a new schedule that first executes this schedule to completion,
 * and then executes the specified schedule to completion.
 */
export function andThenEither_<S, R, ST, B, A, R1, ST1, S1, C, A1 extends A = A>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S1, R1, ST1, A1, C>
) {
  return new Schedule<S | S1, R & R1, E.Either<ST, ST1>, A1, E.Either<B, C>>(
    T.map_(self.initial, (s2) => E.left(s2)),
    (a, s12) =>
      E.fold_(
        s12,
        (s2) =>
          T.orElse_(
            T.map_(self.update(a, s2), (x) => E.left(x)),
            () =>
              T.map_(
                T.chain_(that.initial, (s1) => that.update(a, s1)),
                (x) => E.right(x)
              )
          ),
        (s1) => T.map_(that.update(a, s1), E.right)
      ),
    (a: A1, s12: E.Either<ST, ST1>) =>
      E.fold_(
        s12,
        (e) => E.left(self.extract(a, e)),
        (e) => E.right(that.extract(a, e))
      )
  )
}

/**
 * Returns a new schedule that maps this schedule to a constant output.
 */
export function as_<S, R, ST, A, B, C>(self: Schedule<S, R, ST, A, B>, c: C) {
  return map_(self, () => c)
}

/**
 * Returns a new schedule that maps this schedule to a constant output.
 */
export function as<C>(c: C) {
  return <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) => map_(self, () => c)
}

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export function both_<S, R, ST, B, A, R1, ST1, S1, C, A1 extends A = A>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S1, R1, ST1, A1, C>
) {
  return new Schedule<unknown, R & R1, [ST, ST1], A1, [B, C]>(
    T.zipPar_(self.initial, that.initial),
    (a, s) => T.zipPar_(self.update(a, s[0]), that.update(a, s[1])),
    (a, s) => [self.extract(a, s[0]), that.extract(a, s[1])]
  )
}

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export function both<A, R1, ST1, S1, C, A1 extends A = A>(
  that: Schedule<S1, R1, ST1, A1, C>
) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) =>
    new Schedule<unknown, R & R1, [ST, ST1], A1, [B, C]>(
      T.zipPar_(self.initial, that.initial),
      (a, s) => T.zipPar_(self.update(a, s[0]), that.update(a, s[1])),
      (a, s) => [self.extract(a, s[0]), that.extract(a, s[1])]
    )
}

/**
 * Peeks at the output produced by this schedule, executes some action, and
 * then continues the schedule or not based on the specified state predicate.
 */
export function check_<S, R, ST, A, B, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A, b: B) => T.Effect<S2, R2, never, boolean>
): Schedule<S | S2, R & R2, ST, A, B> {
  return updated_(self, (upd) => (a, s) =>
    T.chain_(f(a, self.extract(a, s)), (b) => (b ? T.fail(undefined) : upd(a, s)))
  )
}

/**
 * Peeks at the output produced by this schedule, executes some action, and
 * then continues the schedule or not based on the specified state predicate.
 */
export function check<A, B, S2, R2>(
  f: (a: A, b: B) => T.Effect<S2, R2, never, boolean>
) {
  return <S, R, ST>(self: Schedule<S, R, ST, A, B>) => check_(self, f)
}

/**
 * Chooses between two schedules with different outputs.
 */
export function choose_<S, R, ST, A, B, S2, R2, ST2, A2, B2>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>
): Schedule<S | S2, R & R2, [ST, ST2], E.Either<A, A2>, E.Either<B, B2>> {
  return new Schedule<S | S2, R & R2, [ST, ST2], E.Either<A, A2>, E.Either<B, B2>>(
    T.zip_(self.initial, that.initial),
    (a, s) =>
      E.fold_(
        a,
        (a) => T.map_(self.update(a, s[0]), (a): [ST, ST2] => [a, s[1]]),
        (a) => T.map_(that.update(a, s[1]), (a): [ST, ST2] => [s[0], a])
      ),
    (a, s) =>
      E.fold_(
        a,
        (a) => E.left(self.extract(a, s[0])),
        (a) => E.right(that.extract(a, s[1]))
      )
  )
}

/**
 * Chooses between two schedules with different outputs.
 */
export function choose<S, R, ST, A, B, S2, R2, ST2, A2, B2>(
  that: Schedule<S2, R2, ST2, A2, B2>
) {
  return (
    self: Schedule<S, R, ST, A, B>
  ): Schedule<S | S2, R & R2, [ST, ST2], E.Either<A, A2>, E.Either<B, B2>> =>
    choose_(self, that)
}

/**
 * Returns a new schedule that collects the outputs of this one into a list.
 */
export function collectFrom<S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) {
  return fold_(self, [] as readonly B[], (z, b) => [b, ...z])
}

/**
 * Returns a new schedule that collects the outputs of this one into a list.
 */
export function collectAll<A>() {
  return collectFrom(id<A>())
}

/**
 * A schedule that recurs as long as the condition f holds, collecting all inputs into a list.
 */
export function collectWhile<A>(f: (a: A) => boolean) {
  return collectFrom(doWhile(f))
}

/**
 * A schedule that recurs as long as the effectful condition holds, collecting all inputs into a list.
 */
export function collectWhileM<A, S, R>(f: (a: A) => T.Effect<S, R, never, boolean>) {
  return collectFrom(doWhileM(f))
}

/**
 * A schedule that recurs until the condition f holds, collecting all inputs into a list.
 */
export function collectUntil<A>(f: (a: A) => boolean) {
  return collectFrom(doUntil(f))
}

/**
 * A schedule that recurs until the effectful condition holds, collecting all inputs into a list.
 */
export function collectUntilM<A, S, R>(f: (a: A) => T.Effect<S, R, never, boolean>) {
  return collectFrom(doUntilM(f))
}

/**
 * Returns a new schedule that deals with a narrower class of inputs than
 * this schedule.
 */
export function contramap_<S, R, ST, A, B, A1>(
  self: Schedule<S, R, ST, A, B>,
  f: (_: A1) => A
): Schedule<S, R, ST, A1, B> {
  return new Schedule(
    self.initial,
    (a, s) => self.update(f(a), s),
    (a, s) => self.extract(f(a), s)
  )
}

/**
 * Returns a new schedule that deals with a narrower class of inputs than
 * this schedule.
 */
export function contramap<A, A1>(f: (_: A1) => A) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A, B>): Schedule<S, R, ST, A1, B> =>
    new Schedule(
      self.initial,
      (a, s) => self.update(f(a), s),
      (a, s) => self.extract(f(a), s)
    )
}

/**
 * Returns a new schedule with the specified pure modification
 * applied to each delay produced by this schedule.
 */
export function delayed(f: (ms: number) => number) {
  return <S, A, B, ST, R = unknown>(self: Schedule<S, R & HasClock, ST, A, B>) =>
    delayedM_(self, (x) => T.succeedNow(f(x)))
}

/**
 * Returns a new schedule with the specified pure modification
 * applied to each delay produced by this schedule.
 */
export function delayed_<S, A, B, ST, R = unknown>(
  self: Schedule<S, R & HasClock, ST, A, B>,
  f: (ms: number) => number
) {
  return delayedM_(self, (x) => T.succeedNow(f(x)))
}

/**
 * Returns a new schedule with the specified effectful modification
 * applied to each delay produced by this schedule.
 */
export function delayedM<R0 = unknown>(f: (ms: number) => T.AsyncR<R0, number>) {
  return <S, A, B, ST, R = unknown>(self: Schedule<S, R & HasClock, ST, A, B>) =>
    delayedM_(self, f)
}

/**
 * Returns a new schedule with the specified effectful modification
 * applied to each delay produced by this schedule.
 */
export function delayedM_<S, A, B, ST, R = unknown, R0 = unknown>(
  self: Schedule<S, R & HasClock, ST, A, B>,
  f: (ms: number) => T.AsyncR<R0, number>
): Schedule<S, R & R0 & HasClock, [ST, R0 & R & HasClock], A, B> {
  return new Schedule(
    pipe(
      T.of,
      T.bind("oldEnv", () => T.environment<R0 & R & HasClock>()),
      T.let("env", (s): R0 & R & HasClock =>
        replaceServiceIn_(
          s.oldEnv,
          HasClock,
          (c) =>
            new ProxyClock(c.currentTime, (ms) =>
              T.provideAll_(
                T.chain_(f(ms), (n) => c.sleep(n)),
                s.oldEnv
              )
            )
        )
      ),
      T.bind("initial", (s) => T.provideAll_(self.initial, s.env)),
      T.map((s): [ST, R0 & R & HasClock] => [s.initial, s.env])
    ),
    (a: A, s: [ST, R0 & R & HasClock]) =>
      T.map_(T.provideAll_(self.update(a, s[0]), s[1]), (_): [
        ST,
        R0 & R & HasClock
      ] => [_, s[1]]),
    (a: A, s: [ST, R0 & R & HasClock]) => self.extract(a, s[0])
  )
}

/**
 * Returns a new schedule that contramaps the input and maps the output.
 */
export function dimap_<S, R, ST, A, B, A1, C>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => A,
  g: (b: B) => C
): Schedule<S, R, ST, A1, C> {
  return map_(contramap_(self, f), g)
}

/**
 * Returns a new schedule that contramaps the input and maps the output.
 */
export function dimap<A, A1>(f: (a: A1) => A) {
  return <B, C>(g: (b: B) => C) => <S, R, ST>(
    self: Schedule<S, R, ST, A, B>
  ): Schedule<S, R, ST, A1, C> => map_(contramap_(self, f), g)
}

/**
 * A schedule that recurs for until the predicate evaluates to true.
 */
export function doUntilM<A, S, R>(f: (a: A) => T.Effect<S, R, never, boolean>) {
  return untilInputM_(id<A>(), f)
}

/**
 * A schedule that recurs for until the predicate evaluates to true.
 */
export function doUntil<A>(f: (a: A) => boolean) {
  return untilInput_(id<A>(), f)
}

/**
 * A schedule that recurs for until the predicate is equal.
 */
export function doUntilEquals<A>(a: A, eq?: Eq<A>) {
  return untilInput_(id<A>(), (b) => (eq ? eq.equals(a, b) : b === a))
}

/**
 * A schedule that recurs for until the predicate evaluates to true.
 */
export function doWhileM<A, S, R>(f: (a: A) => T.Effect<S, R, never, boolean>) {
  return whileInputM_(id<A>(), f)
}

/**
 * A schedule that recurs for until the predicate evaluates to true.
 */
export function doWhile<A>(f: (a: A) => boolean) {
  return whileInput_(id<A>(), f)
}

/**
 * A schedule that recurs for until the predicate is equal.
 */
export function doWhileEquals<A>(a: A, eq?: Eq<A>) {
  return whileInput_(id<A>(), (b) => (eq ? eq.equals(a, b) : b === a))
}

/**
 * A schedule that will recur until the specified duration elapses. Returns
 * the total elapsed time.
 */
export function duration(duration: number) {
  return untilOutput_(elapsed, (n) => n > duration)
}

/**
 * Returns the composition of this schedule and the specified schedule,
 * by piping the output of this one into the input of the other.
 * Effects described by this schedule will always be executed before the effects described by the second schedule.
 */
export function either_<S, R, ST, A, B, S1, R1, ST1, A1 extends A, C>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S1, R1, ST1, A1, C>
): Schedule<unknown, R & R1, [ST, ST1], A1, [B, C]> {
  return new Schedule<unknown, R & R1, [ST, ST1], A1, [B, C]>(
    T.zip_(self.initial, that.initial),
    (a, s) =>
      T.map_(
        T.raceEither_(self.update(a, s[0]), that.update(a, s[1])),
        E.fold(
          (s1): [ST, ST1] => [s1, s[1]],
          (s2): [ST, ST1] => [s[0], s2]
        )
      ),
    (a, s) => [self.extract(a, s[0]), that.extract(a, s[1])]
  )
}

/**
 * Returns the composition of this schedule and the specified schedule,
 * by piping the output of this one into the input of the other.
 * Effects described by this schedule will always be executed before the effects described by the second schedule.
 */
export function either<A, B, S1, R1, ST1, A1 extends A, C>(
  that: Schedule<S1, R1, ST1, A1, C>
) {
  return <S, R, ST>(
    self: Schedule<S, R, ST, A, B>
  ): Schedule<unknown, R & R1, [ST, ST1], A1, [B, C]> => either_(self, that)
}

/**
 * The same as `either` followed by `map`.
 */
export function eitherWith_<S, R, ST, A, B, S1, R1, ST1, A1 extends A, C, D>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S1, R1, ST1, A1, C>,
  f: (b: B, c: C) => D
): Schedule<unknown, R & R1, [ST, ST1], A1, D> {
  return map_(either_(self, that), ([b, c]) => f(b, c))
}

/**
 * The same as `either` followed by `map`.
 */
export function eitherWith<B, C, D>(f: (b: B, c: C) => D) {
  return <A, S1, R1, ST1, A1 extends A>(that: Schedule<S1, R1, ST1, A1, C>) => <
    S,
    R,
    ST
  >(
    self: Schedule<S, R, ST, A, B>
  ) => eitherWith_(self, that, f)
}

/**
 * A schedule that recurs forever without delay. Returns the elapsed time
 * since the schedule began.
 */
export const elapsed = new Schedule<never, HasClock, [number, number], unknown, number>(
  T.map_(currentTime, (n) => [n, 0]),
  (_, [start, __]) => T.map_(currentTime, (n) => [start, n - start]),
  (_, [__, n]) => n
)

/**
 * Runs the specified finalizer as soon as the schedule is complete. Note
 * that unlike `Effect#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the
 * schedule may not run to completion. However, if the `Schedule` ever
 * decides not to continue, then the finalizer will be run.
 */
export function ensuring_<S, R, ST, A, B, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  finalizer: T.Effect<S2, R2, never, any>
): Schedule<S | S2, R & R2, [ST, R.Ref<T.Effect<S2, R2, never, any>>], A, B> {
  return new Schedule(
    T.zip_(self.initial, R.makeRef(finalizer)),
    (a: A, s: [ST, R.Ref<T.Effect<S2, R2, never, any>>]) =>
      T.map_(
        T.tapError_(self.update(a, s[0]), (_) =>
          pipe(
            s[1],
            R.modify((fin) => [fin, T.unit]),
            T.flatten
          )
        ),
        (_): [ST, R.Ref<T.Effect<S2, R2, never, any>>] => [_, s[1]]
      ),
    (a, [s]) => self.extract(a, s)
  )
}

/**
 * Runs the specified finalizer as soon as the schedule is complete. Note
 * that unlike `Effect#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the
 * schedule may not run to completion. However, if the `Schedule` ever
 * decides not to continue, then the finalizer will be run.
 */
export function ensuring<S2, R2>(finalizer: T.Effect<S2, R2, never, any>) {
  return <S, R, ST, A, B>(
    self: Schedule<S, R, ST, A, B>
  ): Schedule<S | S2, R & R2, [ST, R.Ref<T.Effect<S2, R2, never, any>>], A, B> =>
    ensuring_(self, finalizer)
}

/**
 * A schedule that always recurs, but will wait a certain amount between
 * repetitions, given by `base * factor.pow(n)`, where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 */
export function exponential(base: number, factor = 2.0) {
  return fromDelays(
    map_(forever, (i) => {
      //console.log(base * Math.pow(factor, i))
      return base * Math.pow(factor, i)
    })
  )
}

/**
 * A schedule that always recurs, increasing delays by summing the
 * preceding two delays (similar to the fibonacci sequence). Returns the
 * current duration between recurrences.
 */
export function fibonacci(one: number) {
  return fromDelays(
    map_(
      unfold_([one, one] as const, ([a, b]) => [b, a + b] as const),
      ([a, _]) => a
    )
  )
}

/**
 * Puts this schedule into the first element of a tuple, and passes along
 * another value unchanged as the second element of the tuple.
 */
export function first<S, R, ST, A, B, C>(self: Schedule<S, R, ST, A, B>) {
  return split_(self, id<C>())
}

/**
 * A schedule that recurs on a fixed interval. Returns the number of
 * repetitions of the schedule so far.
 *
 * If the action run between updates takes longer than the interval, then the
 * action will be run immediately, but re-runs will not "pile up".
 *
 * <pre>
 * |---------interval---------|---------interval---------|
 * |action|                   |action|
 * </pre>
 */
export function fixed(
  ms: number
): Schedule<unknown, HasClock, [number, number, number], unknown, number> {
  if (ms === 0) {
    return new Schedule(
      T.map_(forever.initial, (s) => [s, 0, 0]),
      (a, s) => T.map_(forever.update(a, s[0]), (s) => [s, 0, 0]),
      (a, s) => forever.extract(a, s[0])
    )
  }
  return new Schedule<unknown, HasClock, [number, number, number], unknown, number>(
    T.map_(currentTime, (t) => [t, 1, 0]),
    (_, [start, t0, i]) =>
      T.chain_(currentTime, (now) => {
        const wait = start + t0 * ms - now
        const n = 1 + Math.floor(wait < 0 ? (now - start) / ms : t0)

        return T.map_(T.sleep(Math.max(n, 0)), () => [start, n, i + 1])
      }),
    (_, s) => s[2]
  )
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function foldM_<S, R, ST, A, B, Z, S1, R1>(
  self: Schedule<S, R, ST, A, B>,
  z: Z,
  f: (z: Z, b: B) => T.Effect<S1, R1, never, Z>
): Schedule<S | S1, R & R1, [ST, Z], A, Z> {
  return new Schedule<S | S1, R & R1, [ST, Z], A, Z>(
    T.map_(self.initial, (a) => [a, z]),
    (a, s) =>
      pipe(
        T.of,
        T.bind("s1", () => self.update(a, s[0])),
        T.bind("z1", () => f(s[1], self.extract(a, s[0]))),
        T.map((s) => [s.s1, s.z1])
      ),
    (_, s) => s[1]
  )
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function foldM<Z>(z: Z) {
  return <B, S1, R1>(f: (z: Z, b: B) => T.Effect<S1, R1, never, Z>) => <S, R, ST, A>(
    self: Schedule<S, R, ST, A, B>
  ): Schedule<S | S1, R & R1, [ST, Z], A, Z> => foldM_(self, z, f)
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function fold_<S, R, ST, A, B, Z>(
  self: Schedule<S, R, ST, A, B>,
  z: Z,
  f: (z: Z, b: B) => Z
): Schedule<S, R, [ST, Z], A, Z> {
  return foldM_(self, z, (z, b) => T.succeedNow(f(z, b)))
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function fold<Z>(z: Z) {
  return <B>(f: (z: Z, b: B) => Z) => <S, R, ST, A>(
    self: Schedule<S, R, ST, A, B>
  ): Schedule<S, R, [ST, Z], A, Z> => foldM_(self, z, (z, b) => T.succeedNow(f(z, b)))
}

/**
 * A schedule that recurs forever, producing a count of repeats: 0, 1, 2, ...
 */
export const forever = unfold_(0, (n) => n + 1)

/**
 * A new schedule derived from the specified schedule which transforms the delays into effectful sleeps.
 */
export function fromDelays<S, R, ST, A>(self: Schedule<S, R, ST, A, number>) {
  return addDelay_(self, (n) => n)
}

/**
 * A schedule that recurs once with the specified delay.
 */
export function fromDuration(ms: number) {
  return fromDelays(as(ms)(recurs(1)))
}

/**
 * A schedule that recurs once for each of the specified durations, delaying
 * each time for the length of the specified duration. Returns the length of
 * the current duration between recurrences.
 */
export function fromDurations(
  ms0: number,
  ms1: number,
  ms2: number,
  ms3: number,
  ms4: number
): Schedule<
  unknown,
  HasClock,
  Either<number, Either<number, Either<number, Either<number, number>>>>,
  unknown,
  number
>
export function fromDurations(
  ms0: number,
  ms1: number,
  ms2: number,
  ms3: number
): Schedule<
  unknown,
  HasClock,
  Either<number, Either<number, Either<number, number>>>,
  unknown,
  number
>
export function fromDurations(
  ms0: number,
  ms1: number,
  ms2: number
): Schedule<unknown, HasClock, Either<number, Either<number, number>>, unknown, number>
export function fromDurations(
  ms0: number,
  ms1: number
): Schedule<unknown, HasClock, Either<number, number>, unknown, number>
export function fromDurations(
  ...ms: number[]
): Schedule<unknown, HasClock, any, unknown, number> {
  return A.map_(ms, fromDuration).reduce((s, d) => andThen_(s, d) as any)
}

/**
 * A schedule that recurs forever, mapping input values through the
 * specified function.
 */
export function fromFunction<A, B>(f: (a: A) => B) {
  return map_(id<A>(), f)
}

/**
 * A schedule that recurs forever, returning each input as the output.
 */
export function id<A>(): Schedule<never, unknown, void, A, A> {
  return new Schedule<never, unknown, void, A, A>(
    T.unit,
    () => T.unit,
    (a) => a
  )
}

/**
 * Returns a new schedule with the specified initial state transformed
 * by the specified initial transformer.
 */
export function initialized_<S, R, ST, A, B, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  f: (s: T.Effect<S, R, never, ST>) => T.Effect<S2, R2, never, ST>
) {
  return new Schedule<S | S2, R & R2, ST, A, B>(
    f(self.initial),
    self.update,
    self.extract
  )
}

/**
 * Returns a new schedule with the specified initial state transformed
 * by the specified initial transformer.
 */
export function initialized<S, R, ST, S2, R2>(
  f: (s: T.Effect<S, R, never, ST>) => T.Effect<S2, R2, never, ST>
) {
  return <A, B>(self: Schedule<S, R, ST, A, B>) =>
    new Schedule<S | S2, R & R2, ST, A, B>(f(self.initial), self.update, self.extract)
}

/**
 * Returns the composition of this schedule and the specified schedule,
 * by piping the output of this one into the input of the other.
 * Effects described by this schedule will always be executed before the effects described by the second schedule.
 */
export function into_<S, R, ST, A, B, S2, R2, ST2, C>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, B, C>
) {
  return new Schedule<S | S2, R & R2, [ST, ST2], A, C>(
    T.zip_(self.initial, that.initial),
    (a, s) =>
      pipe(
        T.of,
        T.bind("s1", () => self.update(a, s[0])),
        T.bind("s2", () => that.update(self.extract(a, s[0]), s[1])),
        T.map((s) => [s.s1, s.s2])
      ),
    (a, s) => that.extract(self.extract(a, s[0]), s[1])
  )
}

/**
 * Returns the composition of this schedule and the specified schedule,
 * by piping the output of this one into the input of the other.
 * Effects described by this schedule will always be executed before the effects described by the second schedule.
 */
export function into<S2, R2, ST2, B, C>(that: Schedule<S2, R2, ST2, B, C>) {
  return <S, R, ST, A>(self: Schedule<S, R, ST, A, B>) => into_(self, that)
}

/**
 * Applies random jitter to all sleeps executed by the schedule.
 */
export function jittered_<S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  min: number,
  max: number
) {
  return delayedM_(self, (d) =>
    T.map_(nextDouble, (random) =>
      Math.floor(d * min * (1 - random) + d * max * random)
    )
  )
}

/**
 * Applies random jitter to all sleeps executed by the schedule.
 */
export function jittered(min: number, max: number) {
  return <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) => jittered_(self, min, max)
}

/**
 * Puts this schedule into the first element of a either, and passes along
 * another value unchanged as the second element of the either.
 */
export function left<S, R, ST, A, B, C>(self: Schedule<S, R, ST, A, B>) {
  return choose_(self, id<C>())
}

/**
 * A schedule that always recurs, but will repeat on a linear time
 * interval, given by `base * n` where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 */
export function linear(base: number) {
  return fromDelays(map_(forever, (i) => base * (i + 1)))
}

/**
 * Returns a new schedule that maps over the output of this one.
 */
export function map<B, C>(f: (b: B) => C) {
  return <S, R, ST, A>(self: Schedule<S, R, ST, A, B>) => map_(self, f)
}

/**
 * Returns a new schedule that maps over the output of this one.
 */
export function map_<S, R, ST, A, B, C>(
  self: Schedule<S, R, ST, A, B>,
  f: (b: B) => C
): Schedule<S, R, ST, A, C> {
  return new Schedule(self.initial, self.update, (a: A, s) => f(self.extract(a, s)))
}

/**
 * Returns a new schedule with the specified effectful modification
 * applied to each sleep performed by this schedule.
 *
 * Note that this does not apply to sleeps performed in Schedule#initial.
 * All effects executed while calculating the modified duration will run with the old
 * environment.
 */
export function modifyDelay_<S, R, ST, A, B, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  f: (b: B, ms: number) => T.Effect<S2, R2, never, number>
): Schedule<S, R & R2 & HasClock, ST, A, B> {
  return new Schedule(
    self.initial,
    (a, s) =>
      T.provideSome_(self.update(a, s), (r: R & R2 & HasClock): R & HasClock =>
        replaceServiceIn_(
          r,
          HasClock,
          (c) =>
            new ProxyClock(c.currentTime, (ms) =>
              T.chain_(T.provideAll_(f(self.extract(a, s), ms), r), (ms) => c.sleep(ms))
            )
        )
      ),
    self.extract
  )
}

/**
 * Returns a new schedule with the specified effectful modification
 * applied to each sleep performed by this schedule.
 *
 * Note that this does not apply to sleeps performed in Schedule#initial.
 * All effects executed while calculating the modified duration will run with the old
 * environment.
 */
export function modifyDelay<B, S2, R2>(
  f: (b: B, ms: number) => T.Effect<S2, R2, never, number>
) {
  return <S, R, ST, A>(
    self: Schedule<S, R, ST, A, B>
  ): Schedule<S, R & R2 & HasClock, ST, A, B> => modifyDelay_(self, f)
}

/**
 * A schedule that waits forever when updating or initializing.
 */
export const never = new Schedule(
  T.never,
  () => T.never,
  (_, n) => n
)

/**
 * Returns a new schedule that will not perform any sleep calls between recurrences.
 */
export function noDelay<S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) {
  return provideSome_(self, (r: R & HasClock): R & HasClock =>
    replaceServiceIn_(r, HasClock, (c) => new ProxyClock(c.currentTime, () => T.unit))
  )
}

/**
 * A schedule that executes once.
 */
export const once = unit(recurs(1))

/**
 * A new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export function onDecision_<S, R, ST, A1 extends A, B, A, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1, o: O.Option<ST>) => T.Effect<S2, R2, never, any>
): Schedule<S | S2, R & R2, ST, A1, B> {
  return updated_(self, (update) => (a, s) =>
    T.tapBoth_(
      update(a, s),
      () => f(a, O.none),
      (s) => f(a, O.some(s))
    )
  )
}

/**
 * A new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export function onDecision<ST, A, B, A1 extends A, S2, R2>(
  f: (a: A1, o: O.Option<ST>) => T.Effect<S2, R2, never, any>
) {
  return <S, R>(self: Schedule<S, R, ST, A, B>): Schedule<S | S2, R & R2, ST, A1, B> =>
    onDecision_(self, f)
}

/**
 * Provide all requirements to the schedule.
 */
export function provideAll<R>(r: R) {
  return <S, ST, A, B>(self: Schedule<S, R, ST, A, B>) =>
    new Schedule<S, unknown, ST, A, B>(
      T.provideAll_(self.initial, r),
      (a, s) => T.provideAll_(self.update(a, s), r),
      (a, s) => self.extract(a, s)
    )
}

/**
 * Provide all requirements to the schedule.
 */
export function provideAll_<S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>, r: R) {
  return new Schedule<S, unknown, ST, A, B>(
    T.provideAll_(self.initial, r),
    (a, s) => T.provideAll_(self.update(a, s), r),
    (a, s) => self.extract(a, s)
  )
}

/**
 * Provide some of the requirements to the schedule.
 */
export function provideSome<R, R0>(f: (r0: R0) => R) {
  return <S, ST, A, B>(self: Schedule<S, R, ST, A, B>) =>
    new Schedule<S, R0, ST, A, B>(
      T.provideSome_(self.initial, f),
      (a, s) => T.provideSome_(self.update(a, s), f),
      (a, s) => self.extract(a, s)
    )
}

/**
 * Provide some of the requirements to the schedule.
 */
export function provideSome_<S, R, ST, A, B, R0>(
  self: Schedule<S, R, ST, A, B>,
  f: (r0: R0) => R
) {
  return new Schedule<S, R0, ST, A, B>(
    T.provideSome_(self.initial, f),
    (a, s) => T.provideSome_(self.update(a, s), f),
    (a, s) => self.extract(a, s)
  )
}

/**
 * A schedule that sleeps for random duration that is uniformly distributed in the given range.
 * The schedules output is the duration it has slept on the last update, or 0 if it hasn't updated yet.
 */
export function randomDelay(
  min: number,
  max: number
): Schedule<unknown, HasRandom & HasClock, number, unknown, number> {
  return new Schedule(
    T.succeedNow(0),
    () => T.chain_(nextIntBetween(min, max), (s) => T.as_(T.sleep(s), s)),
    (_, s) => s
  )
}

/**
 * Returns a new schedule that effectfully reconsiders the decision made by
 * this schedule.
 * The provided either will be a Left if the schedule has failed and will contain the old state
 * or a Right with the new state if the schedule has updated successfully.
 */
export function reconsider_<S, R, ST, A, B, S1, R1, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1, e: E.Either<ST, ST>) => T.Effect<S1, R1, void, ST>
): Schedule<S | S1, R & R1, ST, A1, B> {
  return updated_(self, (update) => (a: A1, s) =>
    T.foldM_(
      update(a, s),
      () => f(a, E.left(s)),
      (s1) => f(a, E.right(s1))
    )
  )
}

/**
 * Returns a new schedule that effectfully reconsiders the decision made by
 * this schedule.
 * The provided either will be a Left if the schedule has failed and will contain the old state
 * or a Right with the new state if the schedule has updated successfully.
 */
export function reconsider<ST, A, S1, R1, A1 extends A>(
  f: (a: A1, e: E.Either<ST, ST>) => T.Effect<S1, R1, void, ST>
) {
  return <S, R, B>(
    self: Schedule<S, R, ST, A, B>
  ): Schedule<S | S1, R & R1, ST, A1, B> => reconsider_(self, f)
}

/**
 * A schedule that recurs the specified number of times. Returns the number
 * of repetitions so far.
 *
 * If 0 or negative numbers are given, the operation is not repeated at all.
 */
export function recurs(n: number) {
  return whileOutput_(forever, (k) => k < n)
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export function repeat<S, R, E, A>(self: T.Effect<S, R, E, A>) {
  return <SS, SR, SST, B>(
    schedule: Schedule<SS, SR, SST, A, B>
  ): T.Effect<S | SS, R & SR, E, B> => T.repeatOrElse_(self, schedule, (e) => T.fail(e))
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an
 * effect that executes `io`, and then if that succeeds, executes `io` an
 * additional time.
 */
export function repeat_<SS, SR, SST, B, S, R, E, A>(
  schedule: Schedule<SS, SR, SST, A, B>,
  self: T.Effect<S, R, E, A>
): T.Effect<S | SS, R & SR, E, B> {
  return T.repeatOrElse_(self, schedule, (e) => T.fail(e))
}

/**
 * Emit the number of repetitions of the schedule so far.
 */
export function repetitions<S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) {
  return fold(0)((n, _: B) => n + 1)(self)
}

/**
 * Puts this schedule into the second element of a either, and passes along
 * another value unchanged as the first element of the either.
 */
export function right<S, R, ST, A, B, C>(self: Schedule<S, R, ST, A, B>) {
  return choose_(id<C>(), self)
}

/**
 * Run a schedule using the provided input and collect all outputs.
 */
export function run_<S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  input: Iterable<A>
): T.Effect<S, R, never, readonly B[]> {
  const loop = (
    xs: readonly A[],
    state: ST,
    acc: readonly B[]
  ): T.Effect<S, R, never, readonly B[]> => {
    if (A.isNonEmpty(xs)) {
      const [x, t] = [NA.head(xs), NA.tail(xs)]
      return T.foldM_(
        self.update(x, state),
        () => T.succeedNow([self.extract(x, state), ...acc]),
        (s) => loop(t, s, [self.extract(x, state), ...acc])
      )
    } else {
      return T.succeedNow(acc)
    }
  }

  return T.map_(
    T.chain_(self.initial, (_) => loop(Array.from(input), _, [])),
    A.reverse
  )
}

/**
 * Run a schedule using the provided input and collect all outputs.
 */
export function run<A>(input: Iterable<A>) {
  return <S, R, ST, B>(
    self: Schedule<S, R, ST, A, B>
  ): T.Effect<S, R, never, readonly B[]> => run_(self, input)
}

/**
 * Puts this schedule into the second element of a tuple, and passes along
 * another value unchanged as the first element of the tuple.
 */
export function second<S, R, ST, A, B, C>(self: Schedule<S, R, ST, A, B>) {
  return split_(id<C>(), self)
}

/**
 * A schedule that waits for the specified amount of time between each
 * input. Returns the number of inputs so far.
 *
 * <pre>
 * |action|-----interval-----|action|-----interval-----|action|
 * </pre>
 */
export function spaced(interval: number) {
  return addDelay_(forever, () => interval)
}

/**
 * Split the input
 */
export function split<S2, R2, ST2, A2, B2>(that: Schedule<S2, R2, ST2, A2, B2>) {
  return <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) => split_(self, that)
}

/**
 * Split the input
 */
export function split_<S, R, ST, A, B, S2, R2, ST2, A2, B2>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>
): Schedule<unknown, R & R2, [ST, ST2], [A, A2], [B, B2]> {
  return new Schedule<unknown, R & R2, [ST, ST2], [A, A2], [B, B2]>(
    T.zip_(self.initial, that.initial),
    ([a0, a1], [s0, s1]) => T.zipPar_(self.update(a0, s0), that.update(a1, s1)),
    ([a0, a1], [s0, s1]) => [self.extract(a0, s0), that.extract(a1, s1)]
  )
}

/**
 * A schedule that always fails.
 */
export const stop = unit(recurs(0))

/**
 * A schedule that recurs forever, returning the constant for every output.
 */
export function succeed<A>(a: A) {
  return as_(forever, a)
}

/**
 * Sends every input value to the specified sink.
 */
export function tapInput_<S, R, ST, A, B, S1, R1, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => T.Effect<S1, R1, never, any>
): Schedule<S | S1, R & R1, ST, A1, B> {
  return updated_(self, (update) => (a: A1, s) => T.zipSecond_(f(a), update(a, s)))
}

/**
 * Sends every input value to the specified sink.
 */
export function tapInput<A, S1, R1, A1 extends A>(
  f: (a: A1) => T.Effect<S1, R1, never, any>
) {
  return <S, R, ST, B>(
    self: Schedule<S, R, ST, A, B>
  ): Schedule<S | S1, R & R1, ST, A1, B> => tapInput_(self, f)
}

/**
 * Sends every input value to the specified sink.
 */
export function tapOutput_<S, R, ST, A, B, S1, R1>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: B) => T.Effect<S1, R1, never, any>
): Schedule<S | S1, R & R1, ST, A, B> {
  return updated_(self, (update) => (a, s) =>
    T.chain_(update(a, s), (s1) => T.map_(f(self.extract(a, s1)), () => s1))
  )
}

/**
 * Sends every input value to the specified sink.
 */
export function tapOutput<B, S1, R1>(f: (a: B) => T.Effect<S1, R1, never, any>) {
  return <S, R, ST, A>(
    self: Schedule<S, R, ST, A, B>
  ): Schedule<S | S1, R & R1, ST, A, B> => tapOutput_(self, f)
}

/**
 * A schedule that always recurs without delay, and computes the output
 * through recured application of a function to a base value.
 */
export function unfold<A>(f: (a: A) => A) {
  return (a: A) => unfoldM_(T.succeedNow(a), (a) => T.succeedNow(f(a)))
}

/**
 * A schedule that always recurs without delay, and computes the output
 * through recured application of a function to a base value.
 */
export function unfold_<A>(a: A, f: (a: A) => A) {
  return unfoldM_(T.succeedNow(a), (a) => T.succeedNow(f(a)))
}

/**
 * A schedule that always recurs without delay, and computes the output
 * through recured application of a function to a base value.
 */
export function unfoldM<A, S1, R1>(f: (a: A) => T.Effect<S1, R1, never, A>) {
  return <S, R>(a: T.Effect<S, R, never, A>) => unfoldM_(a, f)
}

/**
 * A schedule that always recurs without delay, and computes the output
 * through recured application of a function to a base value.
 */
export function unfoldM_<S, R, A, S1, R1>(
  a: T.Effect<S, R, never, A>,
  f: (a: A) => T.Effect<S1, R1, never, A>
): Schedule<S | S1, R & R1, A, unknown, A> {
  return new Schedule<S | S1, R & R1, A, unknown, A>(
    a,
    (_, a) => f(a),
    (_, a) => a
  )
}

/**
 * Returns a new schedule that maps this schedule to a void output.
 */
export function unit<S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S, R, ST, A, void> {
  return as(undefined)(self)
}

/**
 * Returns a new schedule that continues the schedule only until the effectful predicate
 * is satisfied on the input of the schedule.
 */
export function untilInputM_<S, R, ST, A, B, S1, R1, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => T.Effect<S1, R1, never, boolean>
) {
  return updated_(self, (update) => (a: A1, s) =>
    T.chain_(f(a), (b) => (b ? T.fail(undefined) : update(a, s)))
  )
}

/**
 * Returns a new schedule that continues the schedule only until the effectful predicate
 * is satisfied on the input of the schedule.
 */
export function untilInputM<A, S1, R1, A1 extends A>(
  f: (a: A1) => T.Effect<S1, R1, never, boolean>
) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => untilInputM_(self, f)
}

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the input of the schedule.
 */
export function untilInput_<S, R, ST, A, B, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => boolean
) {
  return untilInputM_(self, (a: A1) => T.succeedNow(f(a)))
}

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the input of the schedule.
 */
export function untilInput<A, A1 extends A>(f: (a: A1) => boolean) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => untilInput_(self, f)
}

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the output value of the schedule.
 */
export function untilOutputM_<S, R, ST, A, B, S1, R1>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: B) => T.Effect<S1, R1, never, boolean>
) {
  return updated_(self, (update) => (a, s) =>
    T.chain_(f(self.extract(a, s)), (b) => (b ? T.fail(undefined) : update(a, s)))
  )
}

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the output value of the schedule.
 */
export function untilOutputM<B, S1, R1>(f: (a: B) => T.Effect<S1, R1, never, boolean>) {
  return <S, R, ST, A>(self: Schedule<S, R, ST, A, B>) => untilOutputM_(self, f)
}

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the output value of the schedule.
 */
export function untilOutput_<S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: B) => boolean
) {
  return untilOutputM_(self, (a) => T.succeedNow(f(a)))
}

/**
 * Returns a new schedule that continues the schedule only until the predicate
 * is satisfied on the output value of the schedule.
 */
export function untilOutput<B>(f: (a: B) => boolean) {
  return <S, R, ST, A>(self: Schedule<S, R, ST, A, B>) => untilOutput_(self, f)
}

/**
 * Returns a new schedule with the update function transformed by the
 * specified update transformer.
 */
export function updated<S, R, ST, A, S2, R2, A1 extends A = A>(
  f: (
    update: (a: A, s: ST) => T.Effect<S, R, void, any>
  ) => (a: A1, s: ST) => T.Effect<S2, R2, void, any>
) {
  return <B>(self: Schedule<S, R, ST, A, B>) =>
    new Schedule<S | S2, R & R2, ST, A1, B>(self.initial, f(self.update), self.extract)
}

/**
 * Returns a new schedule with the update function transformed by the
 * specified update transformer.
 */
export function updated_<S, R, ST, A, B, S2, R2, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (
    update: (a: A, s: ST) => T.Effect<S, R, void, ST>
  ) => (a: A1, s: ST) => T.Effect<S2, R2, void, ST>
): Schedule<S | S2, R & R2, ST, A1, B> {
  return new Schedule<S | S2, R & R2, any, A1, B>(
    self.initial,
    f(self.update),
    self.extract
  )
}

/**
 * Updates a service in the environment of this effect.
 */
export function updateService<R0>(f: (r0: R0) => R0) {
  return <S, R, ST, A, B>(self: Schedule<S, R, ST, A, B>) =>
    provideSome_(self, (r: R & R0) => ({ ...r, ...f(r) }))
}

/**
 * Updates a service in the environment of this effect.
 */
export function updateService_<R0, S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  f: (r0: R0) => R0
) {
  return provideSome_(self, (r: R & R0) => ({ ...r, ...f(r) }))
}

/**
 * Returns a new schedule that continues the schedule only while the effectful predicate
 * is satisfied on the input of the schedule.
 */
export function whileInputM_<S, R, ST, A, B, S1, R1, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => T.Effect<S1, R1, never, boolean>
) {
  return updated_(self, (update) => (a: A1, s) =>
    T.chain_(f(a), (b) => (b ? update(a, s) : T.fail(undefined)))
  )
}

/**
 * Returns a new schedule that continues the schedule only while the effectful predicate
 * is satisfied on the input of the schedule.
 */
export function whileInputM<A, S1, R1, A1 extends A>(
  f: (a: A1) => T.Effect<S1, R1, never, boolean>
) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => whileInputM_(self, f)
}

/**
 * Returns a new schedule that continues the schedule only while the predicate
 * is satisfied on the input of the schedule.
 */
export function whileInput_<S, R, ST, A, B, A1 extends A>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => boolean
) {
  return whileInputM_(self, (a: A1) => T.succeedNow(f(a)))
}

/**
 * Returns a new schedule that continues the schedule only while the predicate
 * is satisfied on the input of the schedule.
 */
export function whileInput<A, A1 extends A>(f: (a: A1) => boolean) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => whileInput_(self, f)
}

/**
 * Returns a new schedule that continues the schedule only while the predicate
 * is satisfied on the output value of the schedule.
 */
export function whileOutputM_<S, R, ST, A, B, S1, R1>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: B) => T.Effect<S1, R1, never, boolean>
) {
  return updated_(self, (update) => (a, s) =>
    T.chain_(f(self.extract(a, s)), (b) => (b ? update(a, s) : T.fail(undefined)))
  )
}

/**
 * Returns a new schedule that continues the schedule only while the predicate
 * is satisfied on the output value of the schedule.
 */
export function whileOutputM<B, S1, R1>(f: (a: B) => T.Effect<S1, R1, never, boolean>) {
  return <S, R, ST, A>(self: Schedule<S, R, ST, A, B>) => whileOutputM_(self, f)
}

/**
 * Returns a new schedule that continues the schedule only while the predicate
 * is satisfied on the output value of the schedule.
 */
export function whileOutput_<S, R, ST, A, B>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: B) => boolean
) {
  return whileOutputM_(self, (a) => T.succeedNow(f(a)))
}

/**
 * Returns a new schedule that continues the schedule only while the predicate
 * is satisfied on the output value of the schedule.
 */
export function whileOutput<B>(f: (a: B) => boolean) {
  return <S, R, ST, A>(self: Schedule<S, R, ST, A, B>) => whileOutput_(self, f)
}

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export function zip<A, S2, R2, ST2, A2 extends A, B2>(
  that: Schedule<S2, R2, ST2, A2, B2>
) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => zip_(self, that)
}

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export function zip_<S, R, ST, A, B, S2, R2, ST2, A2 extends A, B2>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>
): Schedule<unknown, R & R2, [ST, ST2], A2, [B, B2]> {
  return new Schedule<unknown, R & R2, [ST, ST2], A2, [B, B2]>(
    zipPar_(self.initial, that.initial),
    (a, [s0, s1]) => zipPar_(self.update(a, s0), that.update(a, s1)),
    (a, [s0, s1]) => [self.extract(a, s0), that.extract(a, s1)]
  )
}

/**
 * The same as `zip`, but ignores the right output.
 */
export function zipLeft<A, S2, R2, ST2, A2 extends A, B2>(
  that: Schedule<S2, R2, ST2, A2, B2>
) {
  return <S, R, ST, B>(self: Schedule<S, R, ST, A, B>) => zipLeft_(self, that)
}

/**
 * The same as `zip_`, but ignores the right output.
 */
export function zipLeft_<S, R, ST, A, B, S2, R2, ST2, A2 extends A, B2>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>
): Schedule<unknown, R & R2, [ST, ST2], A2, B> {
  return map_(zip_(self, that), ([b, _]) => b)
}

/**
 * The same as `zip`, but ignores the left output.
 */
export function zipRight<A, S2, R2, ST2, A2 extends A, B2>(
  that: Schedule<S2, R2, ST2, A2, B2>
) {
  return <S, R, B>(self: Schedule<S, R, ST2, A, B>) => zipRight_(self, that)
}

/**
 * The same as `zip_`, but ignores the left output.
 */
export function zipRight_<S, R, ST, A, B, S2, R2, ST2, A2 extends A, B2>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>
): Schedule<unknown, R & R2, [ST, ST2], A2, B2> {
  return map_(zip_(self, that), ([_, b]) => b)
}

/**
 * Returns a new schedule that continues only as long as both schedules
 * continue, using the maximum of the delays of the two schedules.
 */
export function zipWith<A, B, S2, R2, ST2, A2 extends A, B2, D>(
  that: Schedule<S2, R2, ST2, A2, B2>,
  f: (b: B, b2: B2) => D
) {
  return <S, R, ST>(self: Schedule<S, R, ST, A, B>) => zipWith_(self, that, f)
}

/**
 * The same as `both` followed by `map`.
 */
export function zipWith_<S, R, ST, A, B, S2, R2, ST2, A2 extends A, B2, D>(
  self: Schedule<S, R, ST, A, B>,
  that: Schedule<S2, R2, ST2, A2, B2>,
  f: (b: B, b2: B2) => D
): Schedule<unknown, R & R2, [ST, ST2], A2, D> {
  return map_(zip_(self, that), ([b, b2]) => f(b, b2))
}

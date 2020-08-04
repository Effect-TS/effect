import * as A from "../../../Array"
import * as E from "../../../Either"
import { pipe } from "../../../Function"
import * as O from "../../../Option"
import * as Clock from "../../Clock"
import * as R from "../../Ref"
import * as T from "../effect"

import * as Decision from "./Decision"
import * as Driver from "./Driver"

/**
 * A `Schedule<S, Env, Inp, Out>` defines a recurring schedule, which consumes values of type `Inp`, and
 * which returns values of type `Out`.
 *
 * Schedules are defined as a possibly infinite set of intervals spread out over time. Each
 * interval defines a window in which recurrence is possible.
 *
 * When schedules are used to repeat or retry effects, the starting boundary of each interval
 * produced by a schedule is used as the moment when the effect will be executed again.
 *
 * Schedules compose in the following primary ways:
 *
 *  * Union. This performs the union of the intervals of two schedules.
 *  * Intersection. This performs the intersection of the intervals of two schedules.
 *  * Sequence. This concatenates the intervals of one schedule onto another.
 *
 * In addition, schedule inputs and outputs can be transformed, filtered (to terminate a
 * schedule early in response to some input or output), and so forth.
 *
 * A variety of other operators exist for transforming and combining schedules, and the companion
 * object for `Schedule` contains all common types of schedules, both for performing retrying, as
 * well as performing repetition.
 */
export class Schedule<S, Env, Inp, Out> {
  constructor(readonly step: Decision.StepFunction<S, Env, Inp, Out>) {}
}

/**
 * Returns a driver that can be used to step the schedule, appropriately handling sleeping.
 */
export function driver<S, Env, Inp, Out>(
  self: Schedule<S, Env, Inp, Out>
): T.Sync<Driver.Driver<S, Clock.HasClock & Env, Inp, Out>> {
  return pipe(
    R.makeRef<
      [O.Option<Out>, Decision.StepFunction<S, Env & Clock.HasClock, Inp, Out>]
    >([O.none, self.step]),
    T.map((ref) => {
      const reset = ref.set([O.none, self.step])

      const last = pipe(
        ref.get,
        T.chain(([o, _]) =>
          O.fold_(
            o,
            () => T.fail(new Driver.NoSuchElementException()),
            (b) => T.succeed(b)
          )
        )
      )

      const next = (i: Inp) =>
        pipe(
          T.of,
          T.bind("step", () => T.map_(ref.get, ([_, o]) => o)),
          T.bind("now", () => Clock.currentTime),
          T.bind("dec", ({ now, step }) => step(now, i)),
          T.bind("v", ({ dec, now }) => {
            switch (dec._tag) {
              case "Done": {
                return pipe(
                  ref.set([O.some(dec.out), Decision.done(dec.out)]),
                  T.chain(() => T.fail(O.none))
                )
              }
              case "Continue": {
                return coerceS<S>()(
                  pipe(
                    ref.set([O.some(dec.out), dec.next]),
                    T.map(() => dec.interval - now),
                    T.chain((s) => (s > 0 ? T.sleep(s) : T.unit)),
                    T.map(() => dec.out)
                  )
                )
              }
            }
          }),
          T.map(({ v }) => v)
        )

      return new Driver.Driver(next, last, reset)
    })
  )
}

function coerceS<S1>() {
  return <S, R, E, A>(self: T.Effect<S, R, E, A>): T.Effect<S1, R, E, A> => self as any
}

function repeatLoop<S, Env, Inp, Out>(
  init: Decision.StepFunction<S, Env, Inp, Out>,
  self: Decision.StepFunction<S, Env, Inp, Out> = init
): Decision.StepFunction<S, Env, Inp, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return repeatLoop(init, self)(now, i)
        }
        case "Continue": {
          return T.succeed(
            new Decision.Continue(d.out, d.interval, repeatLoop(init, d.next))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that loops this one continuously, resetting the state
 * when this schedule is done.
 */
export function repeat<S, Env, Inp, Out>(self: Schedule<S, Env, Inp, Out>) {
  return new Schedule(repeatLoop(self.step))
}

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay<S, Env, Inp, Out>(f: (b: Out) => number) {
  return (self: Schedule<S, Env, Inp, Out>) => addDelayM_(self, (b) => T.succeed(f(b)))
}

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay_<S, Env, Inp, Out>(
  self: Schedule<S, Env, Inp, Out>,
  f: (b: Out) => number
) {
  return addDelayM_(self, (b) => T.succeed(f(b)))
}

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayM<Out, S1, Env1>(
  f: (b: Out) => T.Effect<S1, Env1, never, number>
) {
  return <S, Env, In>(self: Schedule<S, Env, In, Out>) => addDelayM_(self, f)
}

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayM_<S, Env, In, Out, S1, Env1>(
  self: Schedule<S, Env, In, Out>,
  f: (b: Out) => T.Effect<S1, Env1, never, number>
) {
  return modifyDelayM_(self, (o, d) => T.map_(f(o), (i) => i + d))
}

/**
 * The same as `andThenEither`, but merges the output.
 */
export function andThen<In, Env1, S1, Out2, In1 extends In = In>(
  that: Schedule<S1, Env1, In1, Out2>
) {
  return <S, Env, Out>(self: Schedule<S, Env, In, Out>) => andThen_(self, that)
}

/**
 * The same as `andThenEither`, but merges the output.
 */
export function andThen_<S, R, B, A, R1, S1, C, A1 extends A = A>(
  self: Schedule<S, R, A, B>,
  that: Schedule<S1, R1, A1, C>
) {
  return map_(andThenEither_(self, that), (a) => (a._tag === "Left" ? a.left : a.right))
}

/**
 * Returns a new schedule that maps this schedule to a constant output.
 */
export const as = <Out2>(o: Out2) => <S, Env, In, Out>(
  self: Schedule<S, Env, In, Out>
) => map_(self, () => o)

function checkMLoop<S1, Env1, In, In1 extends In, Out, S, Env>(
  test: (i: In1, o: Out) => T.Effect<S1, Env1, never, boolean>,
  self: Decision.StepFunction<S, Env, In, Out>
): Decision.StepFunction<S | S1, Env & Env1, In1, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.succeed(new Decision.Done(d.out))
        }
        case "Continue": {
          return T.map_(test(i, d.out), (b) =>
            b
              ? new Decision.Continue(d.out, d.interval, checkMLoop(test, d.next))
              : new Decision.Done(d.out)
          )
        }
      }
    })
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export const check = <In, In1 extends In, Out>(f: (i: In1, o: Out) => boolean) => <
  S,
  Env
>(
  self: Schedule<S, Env, In, Out>
) => check_(self, f)

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export const check_ = <S, Env, In, In1 extends In, Out>(
  self: Schedule<S, Env, In, Out>,
  f: (i: In1, o: Out) => boolean
) => checkM_(self, (i: In1, o) => T.succeed(f(i, o)))

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export const checkM = <S1, Env1, In, In1 extends In, Out>(
  test: (i: In1, o: Out) => T.Effect<S1, Env1, never, boolean>
) => <S, Env>(self: Schedule<S, Env, In, Out>) =>
  new Schedule(checkMLoop(test, self.step))

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export const checkM_ = <S, Env, S1, Env1, In, In1 extends In, Out>(
  self: Schedule<S, Env, In1, Out>,
  test: (i: In1, o: Out) => T.Effect<S1, Env1, never, boolean>
) => new Schedule(checkMLoop(test, self.step))

/**
 * Returns a new schedule that first executes this schedule to completion, and then executes the
 * specified schedule to completion.
 */
export function andThenEither<S2, Env2, In2 extends In, Out2, In>(
  that: Schedule<S2, Env2, In2, Out2>
) {
  return <S, Env, Out>(
    self: Schedule<S, Env, In, Out>
  ): Schedule<S2 | S, Env & Env2, In2, E.Either<Out, Out2>> =>
    andThenEither_(self, that)
}

function andThenEitherLoop<S, Env, In, Out, S2, Env2, In2 extends In, Out2>(
  self: Decision.StepFunction<S, Env, In, Out>,
  that: Decision.StepFunction<S2, Env2, In2, Out2>,
  onLeft: boolean
): Decision.StepFunction<S | S2, Env & Env2, In2, E.Either<Out, Out2>> {
  return (now, i) => {
    if (onLeft) {
      return T.chain_(self(now, i), (d) => {
        switch (d._tag) {
          case "Continue": {
            return T.succeed(
              new Decision.Continue(
                E.left(d.out),
                d.interval,
                andThenEitherLoop(d.next, that, true)
              )
            )
          }
          case "Done": {
            return andThenEitherLoop(self, that, false)(now, i)
          }
        }
      })
    } else {
      return T.map_(that(now, i), (d) => {
        switch (d._tag) {
          case "Done": {
            return new Decision.Done(E.right(d.out))
          }
          case "Continue": {
            return new Decision.Continue(
              E.right(d.out),
              d.interval,
              andThenEitherLoop(self, d.next, false)
            )
          }
        }
      })
    }
  }
}

/**
 * Returns a new schedule that first executes this schedule to completion, and then executes the
 * specified schedule to completion.
 */
export function andThenEither_<S2, Env2, In2 extends In, Out2, S, Env, Out, In>(
  self: Schedule<S, Env, In, Out>,
  that: Schedule<S2, Env2, In2, Out2>
): Schedule<S2 | S, Env & Env2, In2, E.Either<Out, Out2>> {
  return new Schedule(andThenEitherLoop(self.step, that.step, true))
}

/**
 * Returns a new schedule that collects the outputs of this one into an array.
 */
export const collectAll = <S, Env, In, Out>(self: Schedule<S, Env, In, Out>) =>
  fold_(self, A.empty as A.Array<Out>, (xs, x) => [...xs, x])

function composeLoop<S1, Env1, Out1, S, Env, In, Out>(
  self: Decision.StepFunction<S, Env, In, Out>,
  that: Decision.StepFunction<S1, Env1, Out, Out1>
): Decision.StepFunction<S | S1, Env & Env1, In, Out1> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.map_(that(now, d.out), Decision.toDone)
        }
        case "Continue": {
          return T.map_(that(now, d.out), (d2) => {
            switch (d2._tag) {
              case "Done": {
                return new Decision.Done(d2.out)
              }
              case "Continue": {
                return new Decision.Continue(
                  d2.out,
                  Math.max(d.interval, d2.interval),
                  composeLoop(d.next, d2.next)
                )
              }
            }
          })
        }
      }
    })
}

/**
 * Returns the composition of this schedule and the specified schedule, by piping the output of
 * this one into the input of the other. Effects described by this schedule will always be
 * executed before the effects described by the second schedule.
 */
export const compose = <S1, Env1, Out, Out1>(that: Schedule<S1, Env1, Out, Out1>) => <
  S,
  Env,
  In
>(
  self: Schedule<S, Env, In, Out>
) => compose_(self, that)

/**
 * Returns the composition of this schedule and the specified schedule, by piping the output of
 * this one into the input of the other. Effects described by this schedule will always be
 * executed before the effects described by the second schedule.
 */
export function compose_<S1, Env1, Out1, S, Env, In, Out>(
  self: Schedule<S, Env, In, Out>,
  that: Schedule<S1, Env1, Out, Out1>
) {
  return new Schedule(composeLoop(self.step, that.step))
}

/**
 * A schedule that recurs forever, producing a count of repeats: 0, 1, 2, ...
 */
export const forever = unfold_(0, (n) => n + 1)

function foldMLoop<Z, S, Env, In, Out, S1, Env1>(
  z: Z,
  f: (z: Z, o: Out) => T.Effect<S1, Env1, never, Z>,
  self: Decision.StepFunction<S, Env, In, Out>
): Decision.StepFunction<S | S1, Env & Env1, In, Z> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.succeed<Decision.Decision<S | S1, Env & Env1, In, Z>>(
            new Decision.Done(z)
          )
        }
        case "Continue": {
          return T.map_(
            f(z, d.out),
            (z2) => new Decision.Continue(z2, d.interval, foldMLoop(z2, f, d.next))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function fold<Z>(z: Z) {
  return <Out>(f: (z: Z, o: Out) => Z) => <S, Env, In>(
    self: Schedule<S, Env, In, Out>
  ) => fold_(self, z, f)
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function fold_<S, Env, In, Out, Z>(
  self: Schedule<S, Env, In, Out>,
  z: Z,
  f: (z: Z, o: Out) => Z
) {
  return foldM_(self, z, (z, o) => T.succeed(f(z, o)))
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function foldM<Z>(z: Z) {
  return <S1, Env1, Out>(f: (z: Z, o: Out) => T.Effect<S1, Env1, never, Z>) => <
    S,
    Env,
    In
  >(
    self: Schedule<S, Env, In, Out>
  ) => foldM_(self, z, f)
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function foldM_<S, Env, In, Out, Z, S1, Env1>(
  self: Schedule<S, Env, In, Out>,
  z: Z,
  f: (z: Z, o: Out) => T.Effect<S1, Env1, never, Z>
) {
  return new Schedule(foldMLoop(z, f, self.step))
}

function modifyDelayMLoop<S1, Env1, S, Env, Inp, Out>(
  f: (o: Out, d: number) => T.Effect<S1, Env1, never, number>,
  self: Decision.StepFunction<S, Env, Inp, Out>
): Decision.StepFunction<S | S1, Env & Env1, Inp, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.succeed<Decision.Decision<S | S1, Env & Env1, Inp, Out>>(
            new Decision.Done(d.out)
          )
        }
        case "Continue": {
          const delay = d.interval - now

          return T.map_(
            f(d.out, delay),
            (n) =>
              new Decision.Continue(d.out, d.interval + n, modifyDelayMLoop(f, d.next))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 */
export function modifyDelayM<Out, S1, R1>(
  f: (o: Out, d: number) => T.Effect<S1, R1, never, number>
) {
  return <S, Env, In>(self: Schedule<S, Env, In, Out>) => modifyDelayM_(self, f)
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 */
export function modifyDelayM_<S, Env, In, Out, S1, R1>(
  self: Schedule<S, Env, In, Out>,
  f: (o: Out, d: number) => T.Effect<S1, R1, never, number>
) {
  return new Schedule(modifyDelayMLoop(f, self.step))
}

function mapMLoop<S, Env1, Out2, S1, Env, Inp1, Out>(
  f: (o: Out) => T.Effect<S, Env1, never, Out2>,
  self: Decision.StepFunction<S1, Env, Inp1, Out>
): Decision.StepFunction<S | S1, Env & Env1, Inp1, Out2> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.map_(
            f(d.out),
            (o): Decision.Decision<S | S1, Env & Env1, Inp1, Out2> =>
              new Decision.Done(o)
          )
        }
        case "Continue": {
          return T.map_(
            f(d.out),
            (o) => new Decision.Continue(o, d.interval, mapMLoop(f, d.next))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that maps the output of this schedule through the specified
 * effectful function.
 */
export function map<Out, Out2>(f: (o: Out) => Out2) {
  return <S, Env, In>(self: Schedule<S, Env, In, Out>) => map_(self, f)
}

/**
 * Returns a new schedule that maps the output of this schedule through the specified
 * effectful function.
 */
export function map_<S, Env, In, Out, Out2>(
  self: Schedule<S, Env, In, Out>,
  f: (o: Out) => Out2
) {
  return mapM_(self, (o) => T.succeed(f(o)))
}

/**
 * Returns a new schedule that maps the output of this schedule through the specified function.
 */
export function mapM<Out, S1, Env1, Out2>(
  f: (o: Out) => T.Effect<S1, Env1, never, Out2>
) {
  return <S, Env, In>(self: Schedule<S, Env, In, Out>) =>
    new Schedule(mapMLoop(f, self.step))
}

/**
 * Returns a new schedule that maps the output of this schedule through the specified function.
 */
export function mapM_<S, Env, In, Out, S1, Env1, Out2>(
  self: Schedule<S, Env, In, Out>,
  f: (o: Out) => T.Effect<S1, Env1, never, Out2>
) {
  return new Schedule(mapMLoop(f, self.step))
}

function unfoldLoop<A>(
  a: A,
  f: (a: A) => A
): Decision.StepFunction<never, unknown, unknown, A> {
  return (now, _) => T.succeed(new Decision.Continue(a, now, unfoldLoop(f(a), f)))
}

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfold<A>(f: (a: A) => A) {
  return (a: A) => new Schedule(unfoldLoop(a, f))
}

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfold_<A>(a: A, f: (a: A) => A) {
  return new Schedule(unfoldLoop(a, f))
}

function unfoldMLoop<S, Env, A>(
  a: A,
  f: (a: A) => T.Effect<S, Env, never, A>
): Decision.StepFunction<S, Env, unknown, A> {
  return (now, _) =>
    T.succeed(
      new Decision.Continue(a, now, (n, i) =>
        T.chain_(f(a), (x) => unfoldMLoop(x, f)(n, i))
      )
    )
}

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfoldM<S, Env, A>(f: (a: A) => T.Effect<S, Env, never, A>) {
  return (a: A) => unfoldM_(a, f)
}

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfoldM_<S, Env, A>(a: A, f: (a: A) => T.Effect<S, Env, never, A>) {
  return new Schedule(unfoldMLoop(a, f))
}

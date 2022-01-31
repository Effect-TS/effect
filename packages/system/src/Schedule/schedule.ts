// ets_tracing: off

import * as Clock from "../Clock/index.js"
import * as A from "../Collections/Immutable/Array/index.js"
import * as L from "../Collections/Immutable/List/index.js"
import * as NA from "../Collections/Immutable/NonEmptyArray/index.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as E from "../Either/index.js"
import { pipe, tuple } from "../Function/index.js"
import * as NoSuchElementException from "../GlobalExceptions/index.js"
import * as O from "../Option/index.js"
import * as Random from "../Random/index.js"
import * as R from "../Ref/index.js"
import * as Decision from "./Decision/index.js"
import * as Driver from "./Driver/index.js"
import * as T from "./effect.js"

/**
 * A `Schedule< Env, In, Out>` defines a recurring schedule, which consumes values of type `In`, and
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
export class Schedule<Env, In, Out> {
  constructor(readonly step: Decision.StepFunction<Env, In, Out>) {}

  /**
   * Returns a new schedule that performs a geometric intersection on the intervals defined
   * by both schedules.
   */
  readonly ["&&"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, In & In1, Tp.Tuple<[Out, Out1]>> => intersection_(this, that);

  /**
   * The same as `&&`, but ignores the left output.
   */
  readonly ["***"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, Tp.Tuple<[In, In1]>, Tp.Tuple<[Out, Out1]>> =>
    bothInOut_(this, that);

  /**
   * The same as `&&`, but ignores the left output.
   */
  readonly ["*>"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, In & In1, Out1> => map_(this["&&"](that), (_) => _.get(1));

  /**
   * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
   * feeding inputs to the specified schedule.
   */
  readonly ["+++"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, E.Either<In, In1>, Out | Out1> => chooseMerge_(this, that);

  /**
   * A symbolic alias for `andThen`.
   */
  readonly ["++"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, In & In1, Out | Out1> => andThen_(this, that);

  /**
   * The same as `&&`, but ignores the right output.
   */
  readonly ["<*"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, In & In1, Out> => map_(this["&&"](that), (_) => _.get(0));

  /**
   * An operator alias for `zip`.
   */
  readonly ["<*>"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, In & In1, Tp.Tuple<[Out, Out1]>> => zip_(this, that);

  /**
   * Returns the composition of this schedule and the specified schedule, by piping the output of
   * this one into the input of the other. Effects described by this schedule will always be
   * executed before the effects described by the second schedule.
   */
  readonly ["<<<"] = <Env1, In1>(
    that: Schedule<Env1, In1, In>
  ): Schedule<Env & Env1, In1, Out> => compose_(that, this);

  /**
   * Returns the composition of this schedule and the specified schedule, by piping the output of
   * this one into the input of the other. Effects described by this schedule will always be
   * executed before the effects described by the second schedule.
   */
  readonly [">>>"] = <Env1, Out1>(
    that: Schedule<Env1, Out, Out1>
  ): Schedule<Env & Env1, In, Out1> => compose_(this, that);

  /**
   * Returns a new schedule that performs a geometric union on the intervals defined
   * by both schedules.
   */
  readonly ["||"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, In & In1, Tp.Tuple<[Out, Out1]>> => union_(this, that);

  /**
   * Returns a new schedule that chooses between two schedules with a common output.
   */
  readonly ["|||"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, E.Either<In, In1>, Out | Out1> => chooseMerge_(this, that);

  /**
   * Operator alias for `andThenEither`.
   */
  readonly ["<||>"] = <Env1, In1, Out1>(
    that: Schedule<Env1, In1, Out1>
  ): Schedule<Env & Env1, In & In1, E.Either<Out, Out1>> => andThenEither_(this, that)
}

/**
 * Returns a driver that can be used to step the schedule, appropriately handling sleeping.
 */
export function driver<Env, Inp, Out>(
  self: Schedule<Env, Inp, Out>
): T.UIO<Driver.Driver<Clock.HasClock & Env, Inp, Out>> {
  return pipe(
    R.makeRef<[O.Option<Out>, Decision.StepFunction<Env & Clock.HasClock, Inp, Out>]>([
      O.none,
      self.step
    ]),
    T.map((ref) => {
      const reset = ref.set([O.none, self.step])

      const last = pipe(
        ref.get,
        T.chain(([o, _]) =>
          O.fold_(
            o,
            () => T.fail(new NoSuchElementException.NoSuchElementException()),
            (b) => T.succeed(b)
          )
        )
      )

      const next = (i: Inp) =>
        pipe(
          T.do,
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
                return pipe(
                  ref.set([O.some(dec.out), dec.next]),
                  T.map(() => dec.interval - now),
                  T.chain((s) => (s > 0 ? T.sleep(s) : T.unit)),
                  T.map(() => dec.out)
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

function repeatLoop<Env, Inp, Out>(
  init: Decision.StepFunction<Env, Inp, Out>,
  self: Decision.StepFunction<Env, Inp, Out> = init
): Decision.StepFunction<Env, Inp, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return repeatLoop(init, self)(now, i)
        }
        case "Continue": {
          return T.succeed(
            Decision.makeContinue(d.out, d.interval, repeatLoop(init, d.next))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that loops this one continuously, resetting the state
 * when this schedule is done.
 */
export function repeat<Env, Inp, Out>(self: Schedule<Env, Inp, Out>) {
  return new Schedule(repeatLoop(self.step))
}

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay<Out>(f: (b: Out) => number) {
  return <Env, Inp>(self: Schedule<Env, Inp, Out>) =>
    addDelayM_(self, (b) => T.succeed(f(b)))
}

/**
 * Returns a new schedule with the given delay added to every update.
 */
export function addDelay_<Env, Inp, Out>(
  self: Schedule<Env, Inp, Out>,
  f: (b: Out) => number
) {
  return addDelayM_(self, (b) => T.succeed(f(b)))
}

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayM<Out, Env1>(f: (b: Out) => T.Effect<Env1, never, number>) {
  return <Env, In>(self: Schedule<Env, In, Out>) => addDelayM_(self, f)
}

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export function addDelayM_<Env, In, Out, Env1>(
  self: Schedule<Env, In, Out>,
  f: (b: Out) => T.Effect<Env1, never, number>
) {
  return modifyDelayM_(self, (o, d) => T.map_(f(o), (i) => i + d))
}

/**
 * The same as `andThenEither`, but merges the output.
 */
export function andThen<Env1, Out2, In1>(that: Schedule<Env1, In1, Out2>) {
  return <In, Env, Out>(self: Schedule<Env, In, Out>) => andThen_(self, that)
}

/**
 * The same as `andThenEither`, but merges the output.
 */
export function andThen_<R, B, A, R1, C, A1>(
  self: Schedule<R, A, B>,
  that: Schedule<R1, A1, C>
): Schedule<R & R1, A & A1, B | C> {
  return map_(andThenEither_(self, that), (a) => (a._tag === "Left" ? a.left : a.right))
}

/**
 * Returns a new schedule that maps this schedule to a constant output.
 */
export function as<Out2>(o: Out2) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => map_(self, () => o)
}

function bothLoop<Env, In, Out, Env1, In1, Out1>(
  self: Decision.StepFunction<Env, In, Out>,
  that: Decision.StepFunction<Env1, In1, Out1>
): Decision.StepFunction<Env & Env1, Tp.Tuple<[In, In1]>, Tp.Tuple<[Out, Out1]>> {
  return (now, t) => {
    const {
      tuple: [in1, in2]
    } = t

    return T.zipWith_(self(now, in1), that(now, in2), (d1, d2) => {
      switch (d1._tag) {
        case "Done": {
          switch (d2._tag) {
            case "Done": {
              return Decision.makeDone(Tp.tuple(d1.out, d2.out))
            }
            case "Continue": {
              return Decision.makeDone(Tp.tuple(d1.out, d2.out))
            }
          }
        }
        case "Continue": {
          switch (d2._tag) {
            case "Done": {
              return Decision.makeDone(Tp.tuple(d1.out, d2.out))
            }
            case "Continue": {
              return Decision.makeContinue(
                Tp.tuple(d1.out, d2.out),
                Math.min(d1.interval, d2.interval),
                bothLoop(d1.next, d2.next)
              )
            }
          }
        }
      }
    })
  }
}

/**
 * Returns a new schedule that has both the inputs and outputs of this and the specified
 * schedule.
 */
export function bothInOut<Env1, In1, Out1>(that: Schedule<Env1, In1, Out1>) {
  return <Env, In, Out>(
    self: Schedule<Env, In, Out>
  ): Schedule<Env & Env1, Tp.Tuple<[In, In1]>, Tp.Tuple<[Out, Out1]>> =>
    new Schedule(bothLoop(self.step, that.step))
}

/**
 * Returns a new schedule that has both the inputs and outputs of this and the specified
 * schedule.
 */
export function bothInOut_<Env, In, Out, Env1, In1, Out1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>
): Schedule<Env & Env1, Tp.Tuple<[In, In1]>, Tp.Tuple<[Out, Out1]>> {
  return new Schedule(bothLoop(self.step, that.step))
}

/**
 * Returns a new schedule that has both the inputs and outputs of this and the specified
 * schedule.
 */
export function intersection<Env1, Out1, In1>(that: Schedule<Env1, In1, Out1>) {
  return <Env, In, Out>(
    self: Schedule<Env, In, Out>
  ): Schedule<Env & Env1, In & In1, Tp.Tuple<[Out, Out1]>> => intersection_(self, that)
}

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export function intersection_<Env, In, Out, Env1, In1, Out1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>
): Schedule<Env & Env1, In1 & In, Tp.Tuple<[Out, Out1]>> {
  return intersectWith_(self, that, (l, r) => Math.max(l, r))
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function check<In, Out>(f: (i: In, o: Out) => boolean) {
  return <Env>(self: Schedule<Env, In, Out>) => check_(self, f)
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function check_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (i: In, o: Out) => boolean
) {
  return checkM_(self, (i: In, o) => T.succeed(f(i, o)))
}

function checkMLoop<Env1, In, Out, Env>(
  self: Decision.StepFunction<Env, In, Out>,
  test: (i: In, o: Out) => T.Effect<Env1, never, boolean>
): Decision.StepFunction<Env & Env1, In, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.succeed(Decision.makeDone(d.out))
        }
        case "Continue": {
          return T.map_(test(i, d.out), (b) =>
            b
              ? Decision.makeContinue(d.out, d.interval, checkMLoop(d.next, test))
              : Decision.makeDone(d.out)
          )
        }
      }
    })
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function checkM<Env1, In, Out>(
  test: (i: In, o: Out) => T.Effect<Env1, never, boolean>
) {
  return <Env>(self: Schedule<Env, In, Out>) =>
    new Schedule(checkMLoop(self.step, test))
}

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export function checkM_<In, Env, Env1, Out>(
  self: Schedule<Env, In, Out>,
  test: (i: In, o: Out) => T.Effect<Env1, never, boolean>
) {
  return new Schedule(checkMLoop(self.step, test))
}

/**
 * Returns a new schedule that first executes this schedule to completion, and then executes the
 * specified schedule to completion.
 */
export function andThenEither<Env2, In2, Out2>(that: Schedule<Env2, In2, Out2>) {
  return <Env, In, Out>(
    self: Schedule<Env, In, Out>
  ): Schedule<Env & Env2, In & In2, E.Either<Out, Out2>> => andThenEither_(self, that)
}

function andThenEitherLoop<Env, In, Out, Env2, In2, Out2>(
  self: Decision.StepFunction<Env, In, Out>,
  that: Decision.StepFunction<Env2, In2, Out2>,
  onLeft: boolean
): Decision.StepFunction<Env & Env2, In & In2, E.Either<Out, Out2>> {
  return (now, i) => {
    if (onLeft) {
      return T.chain_(self(now, i), (d) => {
        switch (d._tag) {
          case "Continue": {
            return T.succeed(
              Decision.makeContinue(
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
            return Decision.makeDone(E.right(d.out))
          }
          case "Continue": {
            return Decision.makeContinue(
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
export function andThenEither_<Env2, In2, Out2, Env, Out, In>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env2, In2, Out2>
): Schedule<Env & Env2, In & In2, E.Either<Out, Out2>> {
  return new Schedule(andThenEitherLoop(self.step, that.step, true))
}

function chooseLoop<Env, In, Out, Env1, In1, Out1>(
  self: Decision.StepFunction<Env, In, Out>,
  that: Decision.StepFunction<Env1, In1, Out1>
): Decision.StepFunction<Env & Env1, E.Either<In, In1>, E.Either<Out, Out1>> {
  return (now, either) =>
    E.fold_(
      either,
      (i) =>
        T.map_(self(now, i), (d) => {
          switch (d._tag) {
            case "Done": {
              return Decision.makeDone(E.left(d.out))
            }
            case "Continue": {
              return Decision.makeContinue(
                E.left(d.out),
                d.interval,
                chooseLoop(d.next, that)
              )
            }
          }
        }),
      (i2) =>
        T.map_(that(now, i2), (d) => {
          switch (d._tag) {
            case "Done": {
              return Decision.makeDone(E.right(d.out))
            }
            case "Continue": {
              return Decision.makeContinue(
                E.right(d.out),
                d.interval,
                chooseLoop(self, d.next)
              )
            }
          }
        })
    )
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function choose<Env1, In1, Out1>(that: Schedule<Env1, In1, Out1>) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => choose_(self, that)
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function choose_<Env, In, Out, Env1, In1, Out1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>
): Schedule<Env & Env1, E.Either<In, In1>, E.Either<Out, Out1>> {
  return new Schedule(chooseLoop(self.step, that.step))
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function chooseMerge<Env1, In1, Out1>(that: Schedule<Env1, In1, Out1>) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => chooseMerge_(self, that)
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export function chooseMerge_<Env, In, Out, Env1, In1, Out1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>
): Schedule<Env & Env1, E.Either<In, In1>, Out | Out1> {
  return map_(choose_(self, that), E.merge)
}

/**
 * Returns a new schedule that collects the outputs of this one into an array.
 */
export function collectAll<Env, In, Out>(self: Schedule<Env, In, Out>) {
  return map_(
    fold_(self, L.empty<Out>(), (xs, x) => L.append_(xs, x)),
    L.toArray
  )
}

/**
 * A schedule that recurs anywhere, collecting all inputs into a list.
 */
export function collectAllIdentity<A>() {
  return collectAll(identity<A>())
}

function composeLoop<Env1, Out1, Env, In, Out>(
  self: Decision.StepFunction<Env, In, Out>,
  that: Decision.StepFunction<Env1, Out, Out1>
): Decision.StepFunction<Env & Env1, In, Out1> {
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
                return Decision.makeDone(d2.out)
              }
              case "Continue": {
                return Decision.makeContinue(
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
export function compose<Env1, Out, Out1>(that: Schedule<Env1, Out, Out1>) {
  return <Env, In>(self: Schedule<Env, In, Out>) => compose_(self, that)
}

/**
 * Returns the composition of this schedule and the specified schedule, by piping the output of
 * this one into the input of the other. Effects described by this schedule will always be
 * executed before the effects described by the second schedule.
 */
export function compose_<Env1, Out1, Env, In, Out>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, Out, Out1>
) {
  return new Schedule(composeLoop(self.step, that.step))
}

function intersectWithLoop<Env, In, Out, In1, Env1, Out1>(
  self: Decision.StepFunction<Env, In, Out>,
  that: Decision.StepFunction<Env1, In1, Out1>,
  f: (d1: number, d2: number) => number
): Decision.StepFunction<Env & Env1, In & In1, Tp.Tuple<[Out, Out1]>> {
  return (now, i) => {
    const left = self(now, i)
    const right = that(now, i)

    return T.zipWith_(left, right, (l, r) => {
      switch (l._tag) {
        case "Done": {
          switch (r._tag) {
            case "Done": {
              return Decision.makeDone(Tp.tuple(l.out, r.out))
            }
            case "Continue": {
              return Decision.makeDone(Tp.tuple(l.out, r.out))
            }
          }
        }
        case "Continue": {
          switch (r._tag) {
            case "Done": {
              return Decision.makeDone(Tp.tuple(l.out, r.out))
            }
            case "Continue": {
              return Decision.makeContinue(
                Tp.tuple(l.out, r.out),
                f(l.interval, r.interval),
                intersectWithLoop(l.next, r.next, f)
              )
            }
          }
        }
      }
    })
  }
}

/**
 * Returns a new schedule that deals with a narrower class of inputs than this schedule.
 */
export function contramap<In, In1>(f: (_: In1) => In) {
  return <Env, Out>(self: Schedule<Env, In, Out>) => contramap_(self, f)
}

/**
 * Returns a new schedule that deals with a narrower class of inputs than this schedule.
 */
export function contramap_<Env, In, Out, In1>(
  self: Schedule<Env, In, Out>,
  f: (_: In1) => In
) {
  return new Schedule((now, i: In1) =>
    T.map_(self.step(now, f(i)), Decision.contramap(f))
  )
}

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayed(f: (d: number) => number) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => delayed_(self, f)
}

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayedFrom<Env, In>(schedule: Schedule<Env, In, number>) {
  return addDelay_(schedule, (x) => x)
}

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayed_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (d: number) => number
) {
  return delayedM_(self, (d) => T.succeed(f(d)))
}

/**
 * Returns a new schedule with the specified effectfully computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayedM<Env1>(f: (d: number) => T.Effect<Env1, never, number>) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => delayedM_(self, f)
}

/**
 * Returns a new schedule with the specified effectfully computed delay added before the start
 * of each interval produced by this schedule.
 */
export function delayedM_<Env, In, Out, Env1>(
  self: Schedule<Env, In, Out>,
  f: (d: number) => T.Effect<Env1, never, number>
) {
  return modifyDelayM_(self, (o, d) => f(d))
}

/**
 * Returns a new schedule that contramaps the input and maps the output.
 */
export function dimap<In2, In>(f: (i: In2) => In) {
  return <Out, Out2>(g: (o: Out) => Out2) =>
    <Env>(self: Schedule<Env, In, Out>) =>
      dimap_(self, f, g)
}

/**
 * Returns a new schedule that contramaps the input and maps the output.
 */
export function dimap_<In2, Env, In, Out, Out2>(
  self: Schedule<Env, In, Out>,
  f: (i: In2) => In,
  g: (o: Out) => Out2
) {
  return map_(contramap_(self, f), g)
}

/**
 * A schedule that can recur one time, the specified amount of time into the future.
 */
export function duration(n: number) {
  return new Schedule((now, _: unknown) =>
    T.succeed(Decision.makeContinue(0, now + n, () => T.succeed(Decision.makeDone(n))))
  )
}

/**
 * A schedule that can recur one time, the specified amount of time into the future.
 */
export function durations(n: number, ...rest: number[]) {
  return A.reduce_(rest, duration(n), (acc, d) => andThen_(acc, duration(d)))
}

/**
 * Returns a new schedule that performs a geometric union on the intervals defined
 * by both schedules.
 */
export function union<Env1, In1, Out1>(that: Schedule<Env1, In1, Out1>) {
  return <Env, In, Out>(
    self: Schedule<Env, In, Out>
  ): Schedule<Env & Env1, In & In1, Tp.Tuple<[Out, Out1]>> => union_(self, that)
}

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as either schedule wants to continue and
 * merging the next intervals according to the specified merge function.
 */
export function union_<Env, Out, Env1, In, In1, Out1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>
): Schedule<Env & Env1, In & In1, Tp.Tuple<[Out, Out1]>> {
  return unionWith_(self, that, (d1, d2) => Math.min(d1, d2))
}

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as either schedule wants to continue and
 * merging the next intervals according to the specified merge function.
 */
export function unionWith<Env1, In1, Out1>(
  that: Schedule<Env1, In1, Out1>,
  f: (d1: number, d2: number) => number
) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => unionWith_(self, that, f)
}

function unionWithLoop<Env, Env1, In, In1, Out, Out1>(
  self: Decision.StepFunction<Env, In, Out>,
  that: Decision.StepFunction<Env1, In1, Out1>,
  f: (d1: number, d2: number) => number
): Decision.StepFunction<Env & Env1, In & In1, Tp.Tuple<[Out, Out1]>> {
  return (now, inp) => {
    const left = self(now, inp)
    const right = that(now, inp)

    return T.zipWith_(left, right, (l, r) => {
      switch (l._tag) {
        case "Done": {
          switch (r._tag) {
            case "Done": {
              return Decision.makeDone(Tp.tuple(l.out, r.out))
            }
            case "Continue": {
              return Decision.makeContinue(
                Tp.tuple(l.out, r.out),
                r.interval,
                unionWithLoop(() => T.succeed(l), r.next, f)
              )
            }
          }
        }
        case "Continue": {
          switch (r._tag) {
            case "Done": {
              return Decision.makeContinue(
                Tp.tuple(l.out, r.out),
                l.interval,
                unionWithLoop(l.next, () => T.succeed(r), f)
              )
            }
            case "Continue": {
              return Decision.makeContinue(
                Tp.tuple(l.out, r.out),
                f(l.interval, r.interval),
                unionWithLoop(l.next, r.next, f)
              )
            }
          }
        }
      }
    })
  }
}

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as either schedule wants to continue and
 * merging the next intervals according to the specified merge function.
 */
export function unionWith_<Env, Env1, In, In1, Out, Out1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>,
  f: (d1: number, d2: number) => number
): Schedule<Env & Env1, In & In1, Tp.Tuple<[Out, Out1]>> {
  return new Schedule(unionWithLoop(self.step, that.step, f))
}

function elapsedLoop(
  o: O.Option<number>
): Decision.StepFunction<unknown, unknown, number> {
  return (now, _) =>
    T.succeed(
      O.fold_(
        o,
        () => Decision.makeContinue(0, now, elapsedLoop(O.some(now))),
        (start) => Decision.makeContinue(now - start, now, elapsedLoop(O.some(start)))
      )
    )
}

/**
 * A schedule that occurs everywhere, which returns the total elapsed duration since the
 * first step.
 */
export const elapsed = new Schedule(elapsedLoop(O.none))

/**
 * A schedule that always recurs, but will wait a certain amount between
 * repetitions, given by `base * factor.pow(n)`, where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 */
export function exponential(base: number, factor = 2.0) {
  return delayedFrom(map_(forever, (i) => base * Math.pow(factor, i)))
}

/**
 * A schedule that always recurs, increasing delays by summing the
 * preceding two delays (similar to the fibonacci sequence). Returns the
 * current duration between recurrences.
 */
export function fibonacci(one: number) {
  return delayedFrom(
    map_(
      unfold_(tuple(one, one), ([a1, a2]) => tuple(a1, a1 + a2)),
      ([_]) => _
    )
  )
}

/**
 * A schedule that recurs on a fixed interval. Returns the number of
 * repetitions of the schedule so far.
 *
 * If the action run between updates takes longer than the interval, then the
 * action will be run immediately, but re-runs will not "pile up".
 *
 * <pre>
 * |-----interval-----|-----interval-----|-----interval-----|
 * |---------action--------||action|-----|action|-----------|
 * </pre>
 */
export function fixed(interval: number): Schedule<unknown, unknown, number> {
  type State = { startMillis: number; lastRun: number }

  function loop(
    startMillis: O.Option<State>,
    n: number
  ): Decision.StepFunction<unknown, unknown, number> {
    return (now, _) =>
      T.succeed(
        O.fold_(
          startMillis,
          () =>
            Decision.makeContinue(
              n + 1,
              now + interval,
              loop(O.some({ startMillis: now, lastRun: now + interval }), n + 1)
            ),
          ({ lastRun, startMillis }) => {
            const runningBehind = now > lastRun + interval
            const boundary =
              interval === 0 ? interval : interval - ((now - startMillis) % interval)
            const sleepTime = boundary === 0 ? interval : boundary
            const nextRun = runningBehind ? now : now + sleepTime

            return Decision.makeContinue(
              n + 1,
              nextRun,
              loop(O.some<State>({ startMillis, lastRun: nextRun }), n + 1)
            )
          }
        )
      )
  }

  return new Schedule(loop(O.none, 0))
}

/**
 * A schedule that always recurs, mapping input values through the
 * specified function.
 */
export function fromFunction<A, B>(f: (a: A) => B) {
  return map_(identity<A>(), f)
}

/**
 * A schedule that always recurs, which counts the number of recurrances.
 */
export const count = unfold_(0, (n) => n + 1)

function ensuringLoop<Env1, Env, In, Out>(
  finalizer: T.Effect<Env1, never, any>,
  self: Decision.StepFunction<Env, In, Out>
): Decision.StepFunction<Env & Env1, In, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.as_(finalizer, Decision.makeDone(d.out))
        }
        case "Continue": {
          return T.succeed(
            Decision.makeContinue(d.out, d.interval, ensuringLoop(finalizer, d.next))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that will run the specified finalizer as soon as the schedule is
 * complete. Note that unlike `Effect#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the schedule may not run
 * to completion. However, if the `Schedule` ever decides not to continue, then the
 * finalizer will be run.
 */
export function ensuring<Env1, X>(finalizer: T.Effect<Env1, never, X>) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) =>
    new Schedule(ensuringLoop(finalizer, self.step))
}

/**
 * Returns a new schedule that will run the specified finalizer as soon as the schedule is
 * complete. Note that unlike `Effect#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the schedule may not run
 * to completion. However, if the `Schedule` ever decides not to continue, then the
 * finalizer will be run.
 */
export function ensuring_<Env1, Env, In, Out, X>(
  self: Schedule<Env, In, Out>,
  finalizer: T.Effect<Env1, never, X>
) {
  return new Schedule(ensuringLoop(finalizer, self.step))
}

/**
 * Returns a new schedule that packs the input and output of this schedule into the first
 * element of a tuple. This allows carrying information through this schedule.
 */
export function first<X>() {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => bothInOut_(self, identity<X>())
}

function foldMLoop<Z, Env, In, Out, Env1>(
  z: Z,
  f: (z: Z, o: Out) => T.Effect<Env1, never, Z>,
  self: Decision.StepFunction<Env, In, Out>
): Decision.StepFunction<Env & Env1, In, Z> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.succeed<Decision.Decision<Env & Env1, In, Z>>(Decision.makeDone(z))
        }
        case "Continue": {
          return T.map_(f(z, d.out), (z2) =>
            Decision.makeContinue(z2, d.interval, foldMLoop(z2, f, d.next))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function fold<Z>(z: Z) {
  return <Out>(f: (z: Z, o: Out) => Z) =>
    <Env, In>(self: Schedule<Env, In, Out>) =>
      fold_(self, z, f)
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function fold_<Env, In, Out, Z>(
  self: Schedule<Env, In, Out>,
  z: Z,
  f: (z: Z, o: Out) => Z
) {
  return foldM_(self, z, (z, o) => T.succeed(f(z, o)))
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function foldM<Z>(z: Z) {
  return <Env1, Out>(f: (z: Z, o: Out) => T.Effect<Env1, never, Z>) =>
    <Env, In>(self: Schedule<Env, In, Out>) =>
      foldM_(self, z, f)
}

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export function foldM_<Env, In, Out, Z, Env1>(
  self: Schedule<Env, In, Out>,
  z: Z,
  f: (z: Z, o: Out) => T.Effect<Env1, never, Z>
) {
  return new Schedule(foldMLoop(z, f, self.step))
}

/**
 * A schedule that recurs forever, producing a count of repeats: 0, 1, 2, ...
 */
export const forever = unfold_(0, (n) => n + 1)

function identityLoop<A>(): Decision.StepFunction<unknown, A, A> {
  return (now, i) => T.succeed(Decision.makeContinue(i, now, identityLoop()))
}

/**
 * A schedule that always recurs, which returns inputs as outputs.
 */
export function identity<A>() {
  return new Schedule(identityLoop<A>())
}

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as both schedules want to continue and
 * merging the next intervals according to the specified merge function.
 */
export function intersectWith_<Env, In, Out, Env2, In2, Out2>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env2, In2, Out2>,
  f: (selfInterval: number, thatInterval: number) => number
): Schedule<Env & Env2, In & In2, Tp.Tuple<[Out, Out2]>> {
  return new Schedule(intersectWithLoop(self.step, that.step, f))
}

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as both schedules want to continue and
 * merging the next intervals according to the specified merge function.
 */
export function intersectWith<Env2, In2, Out2>(
  that: Schedule<Env2, In2, Out2>,
  f: (selfInterval: number, thatInterval: number) => number
): <Env, In, Out>(
  self: Schedule<Env, In, Out>
) => Schedule<Env & Env2, In & In2, Tp.Tuple<[Out, Out2]>> {
  return (self) => intersectWith_(self, that, f)
}

/**
 * Returns a new schedule that randomly modifies the size of the intervals of this schedule.
 */
export function jittered({ max = 0.1, min = 0 }: { min?: number; max?: number } = {}) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => jittered_(self, { min, max })
}

/**
 * Returns a new schedule that randomly modifies the size of the intervals of this schedule.
 */
export function jittered_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  { max = 0.1, min = 0 }: { min?: number; max?: number } = {}
) {
  return delayedM_(self, (d) =>
    T.map_(Random.next, (random) => d * min * (1 - random) + d * max * random)
  )
}

/**
 * A schedule that always recurs, but will repeat on a linear time
 * interval, given by `base * n` where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 */
export function linear(base: number) {
  return delayedFrom(map_(forever, (i) => base * (i + 1)))
}

/**
 * A schedule that recurs one time.
 */
export const once = unit(recurs(1))

function mapMLoop<Env1, Out2, Env, Inp1, Out>(
  f: (o: Out) => T.Effect<Env1, never, Out2>,
  self: Decision.StepFunction<Env, Inp1, Out>
): Decision.StepFunction<Env & Env1, Inp1, Out2> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.map_(
            f(d.out),
            (o): Decision.Decision<Env & Env1, Inp1, Out2> => Decision.makeDone(o)
          )
        }
        case "Continue": {
          return T.map_(f(d.out), (o) =>
            Decision.makeContinue(o, d.interval, mapMLoop(f, d.next))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that makes this schedule available on the `Left` side of an `Either`
 * input, allowing propagating some type `X` through this channel on demand.
 */
export function left<X>() {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => choose_(self, identity<X>())
}

/**
 * Returns a new schedule that maps the output of this schedule through the specified
 * effectful function.
 */
export function map<Out, Out2>(f: (o: Out) => Out2) {
  return <Env, In>(self: Schedule<Env, In, Out>) => map_(self, f)
}

/**
 * Returns a new schedule that maps the output of this schedule through the specified
 * effectful function.
 */
export function map_<Env, In, Out, Out2>(
  self: Schedule<Env, In, Out>,
  f: (o: Out) => Out2
) {
  return mapM_(self, (o) => T.succeed(f(o)))
}

/**
 * Returns a new schedule that maps the output of this schedule through the specified function.
 */
export function mapM<Out, Env1, Out2>(f: (o: Out) => T.Effect<Env1, never, Out2>) {
  return <Env, In>(self: Schedule<Env, In, Out>) => new Schedule(mapMLoop(f, self.step))
}

/**
 * Returns a new schedule that maps the output of this schedule through the specified function.
 */
export function mapM_<Env, In, Out, Env1, Out2>(
  self: Schedule<Env, In, Out>,
  f: (o: Out) => T.Effect<Env1, never, Out2>
) {
  return new Schedule(mapMLoop(f, self.step))
}

function modifyDelayMLoop<Env1, Env, Inp, Out>(
  f: (o: Out, d: number) => T.Effect<Env1, never, number>,
  self: Decision.StepFunction<Env, Inp, Out>
): Decision.StepFunction<Env & Env1, Inp, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.succeed<Decision.Decision<Env & Env1, Inp, Out>>(
            Decision.makeDone(d.out)
          )
        }
        case "Continue": {
          const delay = d.interval - now

          return T.map_(f(d.out, delay), (n) =>
            Decision.makeContinue(d.out, d.interval + n, modifyDelayMLoop(f, d.next))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 */
export function modifyDelayM<Out, R1>(
  f: (o: Out, d: number) => T.Effect<R1, never, number>
) {
  return <Env, In>(self: Schedule<Env, In, Out>) => modifyDelayM_(self, f)
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * effectual function.
 */
export function modifyDelayM_<Env, In, Out, R1>(
  self: Schedule<Env, In, Out>,
  f: (o: Out, d: number) => T.Effect<R1, never, number>
) {
  return new Schedule(modifyDelayMLoop(f, self.step))
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 */
export function modifyDelay<Out>(f: (o: Out, d: number) => number) {
  return <Env, In>(self: Schedule<Env, In, Out>) => modifyDelay_(self, f)
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 */
export function modifyDelay_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (o: Out, d: number) => number
) {
  return modifyDelayM_(self, (o, d) => T.succeed(f(o, d)))
}

function onDecisionLoop<Env, In, Out, Env1>(
  self: Decision.StepFunction<Env, In, Out>,
  f: (d: Decision.Decision<Env, In, Out>) => T.Effect<Env1, never, any>
): Decision.StepFunction<Env & Env1, In, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.as_(f(d), Decision.makeDone(d.out))
        }
        case "Continue": {
          return T.as_(
            f(d),
            Decision.makeContinue(d.out, d.interval, onDecisionLoop(d.next, f))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export function onDecision_<Env, In, Out, Env1, X>(
  self: Schedule<Env, In, Out>,
  f: (d: Decision.Decision<Env, In, Out>) => T.Effect<Env1, never, X>
) {
  return new Schedule(onDecisionLoop(self.step, f))
}

/**
 * Returns a new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export function onDecision<Env, In, Out, Env1, X>(
  f: (d: Decision.Decision<Env, In, Out>) => T.Effect<Env1, never, X>
) {
  return (self: Schedule<Env, In, Out>) => new Schedule(onDecisionLoop(self.step, f))
}

function provideAllLoop<Env, In, Out>(
  env: Env,
  self: Decision.StepFunction<Env, In, Out>
): Decision.StepFunction<unknown, In, Out> {
  return (now, i) =>
    T.provideAll(env)(
      T.map_(self(now, i), (d) => {
        switch (d._tag) {
          case "Done": {
            return Decision.makeDone(d.out)
          }
          case "Continue": {
            return Decision.makeContinue(d.out, d.interval, provideAllLoop(env, d.next))
          }
        }
      })
    )
}

/**
 * Returns a new schedule with its environment provided to it, so the resulting
 * schedule does not require any environment.
 */
export function provideAll<Env>(env: Env) {
  return <In, Out>(self: Schedule<Env, In, Out>) => provideAll_(self, env)
}

/**
 * Returns a new schedule with its environment provided to it, so the resulting
 * schedule does not require any environment.
 */
export function provideAll_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  env: Env
): Schedule<unknown, In, Out> {
  return new Schedule(provideAllLoop(env, self.step))
}

function provideSomeLoop<Env1, Env, In, Out>(
  env: (_: Env1) => Env,
  self: Decision.StepFunction<Env, In, Out>
): Decision.StepFunction<Env1, In, Out> {
  return (now, i) =>
    T.provideSome_(
      T.map_(self(now, i), (d) => {
        switch (d._tag) {
          case "Done": {
            return Decision.makeDone(d.out)
          }
          case "Continue": {
            return Decision.makeContinue(
              d.out,
              d.interval,
              provideSomeLoop(env, d.next)
            )
          }
        }
      }),
      env
    )
}

/**
 * Returns a new schedule with part of its environment provided to it, so the
 * resulting schedule does not require any environment.
 */
export function provideSome<Env1, Env>(env: (e: Env1) => Env) {
  return <In, Out>(self: Schedule<Env, In, Out>) =>
    new Schedule(provideSomeLoop(env, self.step))
}

/**
 * Returns a new schedule with part of its environment provided to it, so the
 * resulting schedule does not require any environment.
 */
export function provideSome_<Env1, Env, In, Out>(
  self: Schedule<Env, In, Out>,
  env: (e: Env1) => Env
): Schedule<Env1, In, Out> {
  return new Schedule(provideSomeLoop(env, self.step))
}

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsider<Env, In, Out, Out2>(
  f: (_: Decision.Decision<Env, In, Out>) => E.Either<Out2, [Out2, number]>
) {
  return (self: Schedule<Env, In, Out>) => reconsider_(self, f)
}

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsider_<Env, In, Out, Out2>(
  self: Schedule<Env, In, Out>,
  f: (_: Decision.Decision<Env, In, Out>) => E.Either<Out2, [Out2, number]>
) {
  return reconsiderM_(self, (d) => T.succeed(f(d)))
}

function reconsiderMLoop<Env, In, Out, Env1, Out2>(
  self: Decision.StepFunction<Env, In, Out>,
  f: (
    _: Decision.Decision<Env, In, Out>
  ) => T.Effect<Env1, never, E.Either<Out2, [Out2, number]>>
): Decision.StepFunction<Env & Env1, In, Out2> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.map_(
            f(d),
            E.fold(
              (o2) => Decision.makeDone(o2),
              ([o2]) => Decision.makeDone(o2)
            )
          )
        }
        case "Continue": {
          return T.map_(
            f(d),
            E.fold(
              (o2) => Decision.makeDone(o2),
              ([o2, int]) => Decision.makeContinue(o2, int, reconsiderMLoop(d.next, f))
            )
          )
        }
      }
    })
}

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsiderM<Env, In, Out, Env1, Out2>(
  f: (
    _: Decision.Decision<Env, In, Out>
  ) => T.Effect<Env1, never, E.Either<Out2, [Out2, number]>>
) {
  return (self: Schedule<Env, In, Out>) => reconsiderM_(self, f)
}

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export function reconsiderM_<Env, In, Out, Env1, Out2>(
  self: Schedule<Env, In, Out>,
  f: (
    _: Decision.Decision<Env, In, Out>
  ) => T.Effect<Env1, never, E.Either<Out2, [Out2, number]>>
): Schedule<Env & Env1, In, Out2> {
  return new Schedule(reconsiderMLoop(self.step, f))
}

/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 */
export function repetitions<Env, In, Out>(self: Schedule<Env, In, Out>) {
  return fold_(self, 0, (n) => n + 1)
}

/**
 * Return a new schedule that automatically resets the schedule to its initial state
 * after some time of inactivity defined by `duration`.
 */
export function resetAfter(duration: number) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) =>
    map_(
      resetWhen_(zip_(self, elapsed), ({ tuple: [_, d] }) => d >= duration),
      ({ tuple: [o] }) => o
    )
}

function resetWhenLoop<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  step: Decision.StepFunction<Env, In, Out>,
  f: (o: Out) => boolean
): Decision.StepFunction<Env, In, Out> {
  return (now, i) =>
    T.chain_(step(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return f(d.out) ? self.step(now, i) : T.succeed(Decision.makeDone(d.out))
        }
        case "Continue": {
          return f(d.out)
            ? self.step(now, i)
            : T.succeed(
                Decision.makeContinue(d.out, d.interval, resetWhenLoop(self, d.next, f))
              )
        }
      }
    })
}

/**
 * Resets the schedule when the specified predicate on the schedule output evaluates to true.
 */
export function resetWhen<Out>(f: (o: Out) => boolean) {
  return <Env, In>(self: Schedule<Env, In, Out>) => resetWhen_(self, f)
}

/**
 * Resets the schedule when the specified predicate on the schedule output evaluates to true.
 */
export function resetWhen_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (o: Out) => boolean
) {
  return new Schedule(resetWhenLoop(self, self.step, f))
}

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export function recurWhile<A>(f: (a: A) => boolean) {
  return whileInput_(identity<A>(), f)
}

/**
 * A schedule that recurs for as long as the effectful predicate evaluates to true.
 */
export function recurWhileM<Env, A>(f: (a: A) => T.Effect<Env, never, boolean>) {
  return whileInputM_(identity<A>(), f)
}

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export function recurWhileEquals<A>(a: A) {
  return whileInput_(identity<A>(), (x) => a === x)
}

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export function recurUntil<A>(f: (a: A) => boolean) {
  return untilInput_(identity<A>(), f)
}

/**
 * A schedule that recurs for as long as the effectful predicate evaluates to true.
 */
export function recurUntilM<Env, A>(f: (a: A) => T.Effect<Env, never, boolean>) {
  return untilInputM_(identity<A>(), f)
}

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export function recurUntilEquals<A>(a: A) {
  return untilInput_(identity<A>(), (x) => x === a)
}

/**
 * A schedule spanning all time, which can be stepped only the specified number of times before
 * it terminates.
 */
export function recurs(n: number) {
  return whileOutput_(forever, (x) => x < n)
}

/**
 * Returns a new schedule that makes this schedule available on the `Right` side of an `Either`
 * input, allowing propagating some type `X` through this channel on demand.
 */
export function right<X>() {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => choose_(identity<X>(), self)
}

function runLoop<Env, In, Out>(
  now: number,
  xs: readonly In[],
  self: Decision.StepFunction<Env, In, Out>,
  acc: readonly Out[]
): T.Effect<Env, never, readonly Out[]> {
  if (A.isNonEmpty(xs)) {
    return T.chain_(self(now, NA.head(xs)), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.succeed([...acc, d.out])
        }
        case "Continue": {
          return runLoop(d.interval, xs, d.next, [...acc, d.out])
        }
      }
    })
  } else {
    return T.succeed(acc)
  }
}

/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 */
export function run<In>(now: number, i: Iterable<In>) {
  return <Env, Out>(self: Schedule<Env, In, Out>) => run_(self, now, i)
}

/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 */
export function run_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  now: number,
  i: Iterable<In>
) {
  return runLoop(now, Array.from(i), self.step, [])
}

/**
 * Returns a new schedule that packs the input and output of this schedule into the second
 * element of a tuple. This allows carrying information through this schedule.
 */
export function second<X>() {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => bothInOut_(identity<X>(), self)
}

function tapInputLoop<Env, In, Out, Env1>(
  self: Decision.StepFunction<Env, In, Out>,
  f: (i: In) => T.Effect<Env1, never, any>
): Decision.StepFunction<Env & Env1, In, Out> {
  return (now, i) =>
    T.chain_(f(i), () =>
      T.map_(self(now, i), (d) => {
        switch (d._tag) {
          case "Done": {
            return Decision.makeDone(d.out)
          }
          case "Continue": {
            return Decision.makeContinue(d.out, d.interval, tapInputLoop(d.next, f))
          }
        }
      })
    )
}

/**
 * Returns a schedule that recurs continuously, each repetition spaced the specified duration
 * from the last run.
 */
export function spaced(duration: number) {
  return addDelay_(forever, () => duration)
}

/**
 * A schedule that does not recur, it just stops.
 */
export const stop = unit(recurs(0))

/**
 * Returns a schedule that repeats one time, producing the specified constant value.
 */
export function succeed<A>(a: A) {
  return as(a)(forever)
}

/**
 * Returns a new schedule that effectfully processes every input to this schedule.
 */
export function tapInput_<Env, In, Out, Env1, X>(
  self: Schedule<Env, In, Out>,
  f: (i: In) => T.Effect<Env1, never, X>
): Schedule<Env & Env1, In, Out> {
  return new Schedule(tapInputLoop(self.step, f))
}

/**
 * Returns a new schedule that effectfully processes every input to this schedule.
 */
export function tapInput<In, Env1, X>(f: (i: In) => T.Effect<Env1, never, X>) {
  return <Env, Out>(self: Schedule<Env, In, Out>) =>
    new Schedule(tapInputLoop(self.step, f))
}

function tapOutputLoop<Env, In, Out, Env1>(
  self: Decision.StepFunction<Env, In, Out>,
  f: (o: Out) => T.Effect<Env1, never, any>
): Decision.StepFunction<Env & Env1, In, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return T.as_(f(d.out), Decision.makeDone(d.out))
        }
        case "Continue": {
          return T.as_(
            f(d.out),
            Decision.makeContinue(d.out, d.interval, tapOutputLoop(d.next, f))
          )
        }
      }
    })
}

/**
 * Returns a new schedule that effectfully processes every output from this schedule.
 */
export function tapOutput<Env1, Out, X>(f: (o: Out) => T.Effect<Env1, never, X>) {
  return <Env, In>(self: Schedule<Env, In, Out>) => tapOutput_(self, f)
}

/**
 * Returns a new schedule that effectfully processes every output from this schedule.
 */
export function tapOutput_<Env, In, Out, Env1, X>(
  self: Schedule<Env, In, Out>,
  f: (o: Out) => T.Effect<Env1, never, X>
): Schedule<Env & Env1, In, Out> {
  return new Schedule(tapOutputLoop(self.step, f))
}

/**
 * Returns a new schedule that maps the output of this schedule to unit.
 */
export function unit<Env, In, Out, Env1>(
  self: Schedule<Env, In, Out>
): Schedule<Env & Env1, In, void> {
  return as<void>(undefined)(self)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInput<In>(f: (i: In) => boolean) {
  return <Env, Out>(self: Schedule<Env, In, Out>) => untilInput_(self, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilInput_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (i: In) => boolean
) {
  return check_(self, (i) => !f(i))
}

/**
 * Returns a new schedule that continues until the specified effectful predicate on the input
 * evaluates to true.
 */
export function untilInputM<Env1, In>(f: (i: In) => T.Effect<Env1, never, boolean>) {
  return <Env, Out>(self: Schedule<Env, In, Out>) => untilInputM_(self, f)
}

/**
 * Returns a new schedule that continues until the specified effectful predicate on the input
 * evaluates to true.
 */
export function untilInputM_<Env1, Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (i: In) => T.Effect<Env1, never, boolean>
) {
  return checkM_(self, (i) => T.map_(f(i), (b) => !b))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutput<Out>(f: (o: Out) => boolean) {
  return <Env, In>(self: Schedule<Env, In, Out>) => untilOutput_(self, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutput_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (o: Out) => boolean
) {
  return check_(self, (_, o) => !f(o))
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutputM<Out, Env1>(f: (o: Out) => T.Effect<Env1, never, boolean>) {
  return <Env, In>(self: Schedule<Env, In, Out>) => untilOutputM_(self, f)
}

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export function untilOutputM_<Env, In, Out, Env1>(
  self: Schedule<Env, In, Out>,
  f: (o: Out) => T.Effect<Env1, never, boolean>
) {
  return checkM_(self, (_, o) => T.map_(f(o), (b) => !b))
}

/**
 * Returns a new schedule that continues for as long the specified predicate on the input
 * evaluates to true.
 */
export function whileInput<In>(f: (i: In) => boolean) {
  return <Env, Out>(self: Schedule<Env, In, Out>) => whileInput_(self, f)
}

/**
 * Returns a new schedule that continues for as long the specified predicate on the input
 * evaluates to true.
 */
export function whileInput_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (i: In) => boolean
) {
  return check_(self, (i) => f(i))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInputM<Env1, In>(f: (i: In) => T.Effect<Env1, never, boolean>) {
  return <Env, Out>(self: Schedule<Env, In, Out>) => whileInputM_(self, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export function whileInputM_<Env1, Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (i: In) => T.Effect<Env1, never, boolean>
) {
  return checkM_(self, (i) => f(i))
}

/**
 * Returns a new schedule that continues for as long the specified predicate on the output
 * evaluates to true.
 */
export function whileOutput<Out>(f: (o: Out) => boolean) {
  return <Env, In>(self: Schedule<Env, In, Out>) => whileOutput_(self, f)
}

/**
 * Returns a new schedule that continues for as long the specified predicate on the output
 * evaluates to true.
 */
export function whileOutput_<Env, In, Out>(
  self: Schedule<Env, In, Out>,
  f: (o: Out) => boolean
) {
  return check_(self, (_, o) => f(o))
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * output evaluates to true.
 */
export function whileOutputM<Out, Env1>(f: (o: Out) => T.Effect<Env1, never, boolean>) {
  return <Env, In>(self: Schedule<Env, In, Out>) => whileOutputM_(self, f)
}

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * output evaluates to true.
 */
export function whileOutputM_<Env, In, Out, Env1>(
  self: Schedule<Env, In, Out>,
  f: (o: Out) => T.Effect<Env1, never, boolean>
) {
  return checkM_(self, (_, o) => T.map_(f(o), (b) => !b))
}

function windowedLoop(
  interval: number,
  startMillis: O.Option<number>,
  n: number
): Decision.StepFunction<unknown, unknown, number> {
  return (now, _) =>
    T.succeed(
      O.fold_(
        startMillis,
        () =>
          Decision.makeContinue(
            n + 1,
            now + interval,
            windowedLoop(interval, O.some(now), n + 1)
          ),
        (startMillis) => {
          return Decision.makeContinue(
            n + 1,
            now + (interval - ((now - startMillis) % interval)),
            windowedLoop(interval, O.some(startMillis), n + 1)
          )
        }
      )
    )
}

/**
 * A schedule that divides the timeline to `interval`-long windows, and sleeps
 * until the nearest window boundary every time it recurs.
 *
 * For example, `windowed(10_000)` would produce a schedule as follows:
 * <pre>
 *      10s        10s        10s       10s
 * |----------|----------|----------|----------|
 * |action------|sleep---|act|-sleep|action----|
 * </pre>
 */
export function windowed(interval: number) {
  return new Schedule(windowedLoop(interval, O.none, 0))
}

function unfoldLoop<A>(
  a: A,
  f: (a: A) => A
): Decision.StepFunction<unknown, unknown, A> {
  return (now, _) => T.succeed(Decision.makeContinue(a, now, unfoldLoop(f(a), f)))
}

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfold<A>(f: (a: A) => A) {
  return (a: A) => unfold_(a, f)
}

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfold_<A>(a: A, f: (a: A) => A) {
  return new Schedule((now) =>
    T.succeedWith(() => Decision.makeContinue(a, now, unfoldLoop(f(a), f)))
  )
}

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfoldM<Env, A>(f: (a: A) => T.Effect<Env, never, A>) {
  return (a: A) => unfoldM_(a, f)
}

function unfoldMLoop<Env, A>(
  a: A,
  f: (a: A) => T.Effect<Env, never, A>
): Decision.StepFunction<Env, unknown, A> {
  return (now, _) =>
    T.succeed(
      Decision.makeContinue(a, now, (n, i) =>
        T.chain_(f(a), (x) => unfoldMLoop(x, f)(n, i))
      )
    )
}

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export function unfoldM_<Env, A>(a: A, f: (a: A) => T.Effect<Env, never, A>) {
  return new Schedule(unfoldMLoop(a, f))
}

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export function zip_<Env, In, Out, Env1, Out1, In1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>
) {
  return intersectWith_(self, that, (d, d2) => Math.max(d, d2))
}

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export function zip<Env1, Out1, In1>(that: Schedule<Env1, In1, Out1>) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) =>
    intersectWith_(self, that, (d, d2) => Math.max(d, d2))
}

/**
 * Same as zip but ignores the right output.
 */
export function zipLeft<Env1, Out1, In1>(that: Schedule<Env1, In1, Out1>) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => zipLeft_(self, that)
}

/**
 * Same as zip but ignores the right output.
 */
export function zipLeft_<Env, In, Out, Env1, Out1, In1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>
) {
  return map_(zip_(self, that), (_) => _.get(0))
}

/**
 * Same as zip but ignores the right output.
 */
export function zipRight<Env1, Out1, In1>(that: Schedule<Env1, In1, Out1>) {
  return <Env, In, Out>(self: Schedule<Env, In, Out>) => zipRight_(self, that)
}

/**
 * Same as zip but ignores the right output.
 */
export function zipRight_<Env, In, Out, Env1, Out1, In1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>
) {
  return map_(zip_(self, that), (_) => _.get(1))
}

/**
 * Equivalent to `zip` followed by `map`.
 */
export function zipWith<Out, Env1, Out1, Out2, In1>(
  that: Schedule<Env1, In1, Out1>,
  f: (o: Out, o1: Out1) => Out2
) {
  return <Env, In>(self: Schedule<Env, In, Out>) => zipWith_(self, that, f)
}

/**
 * Equivalent to `zip` followed by `map`.
 */
export function zipWith_<Env, In, Out, Env1, Out1, Out2, In1>(
  self: Schedule<Env, In, Out>,
  that: Schedule<Env1, In1, Out1>,
  f: (o: Out, o1: Out1) => Out2
) {
  return map_(zip_(self, that), ({ tuple: [o, o1] }) => f(o, o1))
}

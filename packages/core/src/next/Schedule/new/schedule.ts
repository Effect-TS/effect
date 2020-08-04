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
            (b) => T.succeedNow(b)
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
  self: Decision.StepFunction<S, Env, Inp, Out>
): Decision.StepFunction<S, Env, Inp, Out> {
  return (now, i) =>
    T.chain_(self(now, i), (d) => {
      switch (d._tag) {
        case "Done": {
          return repeatLoop(self)(now, i)
        }
        case "Continue": {
          return T.succeedNow(new Decision.Continue(d.out, d.interval, d.next))
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

export const modifyDelayM = (f: () => ) =>
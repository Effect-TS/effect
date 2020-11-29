import * as C from "../../Cause"
import * as Ex from "../../Exit"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as BP from "../../Stream/BufferedPull"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { combine } from "./combine"
import { Stream } from "./definitions"

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 */
export function interleaveWith<R1, E1, O1>(that: Stream<R1, E1, O1>) {
  return (b: Stream<R1, E1, boolean>) => <R, E, O>(
    self: Stream<R, E, O>
  ): Stream<R & R1, E | E1, O | O1> => {
    const loop = (
      leftDone: boolean,
      rightDone: boolean,
      s: T.Effect<R1, O.Option<E1>, boolean>,
      left: T.Effect<R, O.Option<E>, O>,
      right: T.Effect<R1, O.Option<E1>, O1>
    ): T.Effect<
      R & R1,
      never,
      Ex.Exit<
        O.Option<E | E1>,
        readonly [
          O | O1,
          readonly [boolean, boolean, T.Effect<R1, O.Option<E1>, boolean>]
        ]
      >
    > =>
      T.foldCauseM_(
        s,
        (_) =>
          O.fold_(
            C.sequenceCauseOption(_),
            () => T.succeed(Ex.fail(O.none)),
            (e) => T.succeed(Ex.halt(C.map_(e, O.some)))
          ),
        (b) => {
          if (b && !leftDone) {
            return T.foldCauseM_(
              left,
              (_) =>
                O.fold_(
                  C.sequenceCauseOption(_),
                  () => {
                    if (rightDone) {
                      return T.succeed(Ex.fail(O.none))
                    } else {
                      return loop(true, rightDone, s, left, right)
                    }
                  },
                  (e) => T.succeed(Ex.halt(C.map_(e, O.some)))
                ),
              (a) =>
                T.succeed(Ex.succeed([a, [leftDone, rightDone, s] as const] as const))
            )
          } else if (!b && !rightDone) {
            return T.foldCauseM_(
              right,
              (_) =>
                O.fold_(
                  C.sequenceCauseOption(_),
                  () => {
                    if (leftDone) {
                      return T.succeed(Ex.fail(O.none))
                    } else {
                      return loop(leftDone, true, s, left, right)
                    }
                  },
                  (e) => T.succeed(Ex.halt(C.map_(e, O.some)))
                ),
              (a) =>
                T.succeed(Ex.succeed([a, [leftDone, rightDone, s] as const] as const))
            )
          } else {
            return loop(leftDone, rightDone, s, left, right)
          }
        }
      )

    return new Stream(
      pipe(
        M.do,
        M.bind("sides", () => M.mapM_(b.proc, BP.make)),
        M.bind(
          "result",
          ({ sides }) =>
            pipe(
              self,
              combine(that)([
                false as boolean,
                false as boolean,
                BP.pullElement(sides)
              ] as const)(([leftDone, rightDone, sides], left, right) => {
                return loop(leftDone, rightDone, sides, left, right)
              })
            ).proc
        ),
        M.map(({ result }) => result)
      )
    )
  }
}

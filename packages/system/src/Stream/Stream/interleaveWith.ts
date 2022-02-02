// ets_tracing: off
import * as C from "../../Cause/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as Ex from "../../Exit/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as BP from "../../Stream/BufferedPull/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { combine_ } from "./combine.js"
import { Stream } from "./definitions.js"

function loop<R1, E1, O, O1, R, E>(
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
    Tp.Tuple<
      [O | O1, Tp.Tuple<[boolean, boolean, T.Effect<R1, O.Option<E1>, boolean>]>]
    >
  >
> {
  return T.foldCauseM_(
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
          (a) => T.succeed(Ex.succeed(Tp.tuple(a, Tp.tuple(leftDone, rightDone, s))))
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
          (a) => T.succeed(Ex.succeed(Tp.tuple(a, Tp.tuple(leftDone, rightDone, s))))
        )
      } else {
        return loop(leftDone, rightDone, s, left, right)
      }
    }
  )
}

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 */
export function interleaveWith_<R, E, O, R1, E1, O1>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O1>,
  b: Stream<R1, E1, boolean>
): Stream<R & R1, E | E1, O | O1> {
  return new Stream(
    pipe(
      M.do,
      M.bind("sides", () => M.mapM_(b.proc, BP.make)),
      M.bind(
        "result",
        ({ sides }) =>
          pipe(
            combine_(
              self,
              that,
              Tp.tuple(false as boolean, false as boolean, BP.pullElement(sides)),
              ({ tuple: [leftDone, rightDone, sides] }, left, right) => {
                return loop(leftDone, rightDone, sides, left, right)
              }
            )
          ).proc
      ),
      M.map(({ result }) => result)
    )
  )
}

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 *
 * @ets_data_first interleaveWith_
 */
export function interleaveWith<R1, E1, O1>(
  that: Stream<R1, E1, O1>,
  b: Stream<R1, E1, boolean>
) {
  return <R, E, O>(self: Stream<R, E, O>): Stream<R & R1, E | E1, O | O1> =>
    interleaveWith_(self, that, b)
}

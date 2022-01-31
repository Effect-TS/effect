// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as CH from "../../Channel/index.js"
import * as TK from "../../Take/index.js"
import * as C from "../core.js"
import * as HO from "../Handoff.js"

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 */
export function interleaveWith_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  b: C.Stream<R1, E1, boolean>
): C.Stream<R & R1, E | E1, A | A1> {
  const producer = (
    handoff: HO.Handoff<TK.Take<E | E1, A | A1>>
  ): CH.Channel<R1, E | E1, A | A1, unknown, never, never, void> =>
    CH.readWithCause(
      (value) =>
        CH.zipRight_(
          CH.fromEffect(HO.offer(handoff, TK.single(value))),
          producer(handoff)
        ),
      (cause) => CH.fromEffect(HO.offer(handoff, TK.failCause(cause))),
      (_) => CH.fromEffect(HO.offer(handoff, TK.end))
    )

  return new C.Stream(
    CH.managed_(
      pipe(
        M.do,
        M.bind("left", () => T.toManaged(HO.make<TK.Take<E | E1, A | A1>>())),
        M.bind("right", () => T.toManaged(HO.make<TK.Take<E | E1, A | A1>>())),
        M.tap(({ left }) =>
          M.fork(
            CH.runManaged(
              CH.concatMap_(self.channel, (_) => CH.writeChunk(_))[">>>"](
                producer(left)
              )
            )
          )
        ),
        M.tap(({ right }) =>
          M.fork(
            CH.runManaged(
              CH.concatMap_(that.channel, (_) => CH.writeChunk(_))[">>>"](
                producer(right)
              )
            )
          )
        ),
        M.map(({ left, right }) => Tp.tuple(left, right))
      ),
      ({ tuple: [left, right] }) => {
        const process = (
          leftDone: boolean,
          rightDone: boolean
        ): CH.Channel<R1, E | E1, boolean, unknown, E | E1, CK.Chunk<A | A1>, void> =>
          CH.readWithCause(
            (bool) => {
              if (bool && !leftDone) {
                return CH.chain_(
                  CH.fromEffect(HO.take(left)),
                  TK.fold(
                    rightDone ? CH.unit : process(true, rightDone),
                    (cause) => CH.failCause(cause),
                    (chunk) =>
                      CH.zipRight_(CH.write(chunk), process(leftDone, rightDone))
                  )
                )
              }

              if (!bool && !rightDone) {
                return CH.chain_(
                  CH.fromEffect(HO.take(right)),
                  TK.fold(
                    leftDone ? CH.unit : process(leftDone, true),
                    (cause) => CH.failCause(cause),
                    (chunk) =>
                      CH.zipRight_(CH.write(chunk), process(leftDone, rightDone))
                  )
                )
              }

              return process(leftDone, rightDone)
            },
            (cause) => CH.failCause(cause),
            (_) => CH.unit
          )

        return CH.concatMap_(b.channel, (_) => CH.writeChunk(_))[">>>"](
          process(false, false)
        )
      }
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
export function interleaveWith<R1, E1, A1>(
  that: C.Stream<R1, E1, A1>,
  b: C.Stream<R1, E1, boolean>
) {
  return <R, E, A>(self: C.Stream<R, E, A>) => interleaveWith_(self, that, b)
}

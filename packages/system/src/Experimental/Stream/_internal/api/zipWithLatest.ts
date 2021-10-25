// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import * as E from "../../../../Either"
import { pipe } from "../../../../Function"
import * as O from "../../../../Option"
import * as CH from "../../Channel"
import * as MH from "../../Channel/_internal/mergeHelpers"
import * as C from "../core"

/**
 * Zips the two streams so that when a value is emitted by either of the two streams,
 * it is combined with the latest value from the other stream to produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means that
 * emitted elements that are not the last value in chunks will never be used for zipping.
 */
export function zipWithLatest_<R, R1, E, E1, A, A1, A2>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => A2
): C.Stream<R & R1, E | E1, A2> {
  const mergedChannel: CH.Channel<
    R & R1,
    unknown,
    unknown,
    unknown,
    E | E1,
    O.Option<E.Either<A, A1>>,
    any
  > = pipe(
    self.channel,
    CH.mapOut((_) => O.map_(CK.last(_), E.left)),
    CH.mergeWith(
      pipe(
        that.channel,
        CH.mapOut((_) => O.map_(CK.last(_), E.right))
      ),
      (exit) => MH.done(T.done(exit)),
      (exit) => MH.done(T.done(exit))
    )
  )

  const writer = (
    lastLeft: O.Option<A>,
    lastRight: O.Option<A1>
  ): CH.Channel<
    R1,
    E | E1,
    O.Option<E.Either<A, A1>>,
    unknown,
    E | E1,
    CK.Chunk<A2>,
    void
  > =>
    CH.readWith(
      (val) => {
        if (O.isSome(val)) {
          if (E.isLeft(val.value)) {
            const a1 = val.value.left

            if (O.isSome(lastRight)) {
              const a2 = lastRight.value

              return CH.zipRight_(
                CH.write(CK.single(f(a1, a2))),
                writer(O.some(a1), lastRight)
              )
            } else {
              return writer(O.some(a1), lastRight)
            }
          } else {
            const a2 = val.value.right

            if (O.isSome(lastLeft)) {
              const a1 = lastLeft.value

              return CH.zipRight_(
                CH.write(CK.single(f(a1, a2))),
                writer(lastLeft, O.some(a2))
              )
            } else {
              return writer(lastLeft, O.some(a2))
            }
          }
        } else {
          return writer(lastLeft, lastRight)
        }
      },
      (err) => CH.fail(err),
      (_) => CH.unit
    )

  return new C.Stream(mergedChannel[">>>"](writer(O.none, O.none)))
}

/**
 * Zips the two streams so that when a value is emitted by either of the two streams,
 * it is combined with the latest value from the other stream to produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means that
 * emitted elements that are not the last value in chunks will never be used for zipping.
 *
 * @ets_data_first zipWithLatest_
 */
export function zipWithLatest<R1, E1, A, A1, A2>(
  that: C.Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => A2
) {
  return <R, E>(self: C.Stream<R, E, A>) => zipWithLatest_(self, that, f)
}

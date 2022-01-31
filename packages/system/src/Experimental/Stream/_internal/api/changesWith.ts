// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import type * as EQ from "../../../../Equal/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine
 * whether two elements are equal.
 */
export function changesWith_<R, E, A>(
  self: C.Stream<R, E, A>,
  equal: EQ.Equal<A>
): C.Stream<R, E, A> {
  const writer = (
    last: O.Option<A>
  ): CH.Channel<R, E, CK.Chunk<A>, unknown, E, CK.Chunk<A>, void> =>
    CH.readWithCause(
      (chunk) => {
        const {
          tuple: [newLast, newChunk]
        } = CK.reduce_(
          chunk,
          Tp.tuple(last, CK.empty<A>()),
          ({ tuple: [op, os] }, o1) => {
            if (O.isSome(op)) {
              if (equal.equals(op.value, o1)) {
                return Tp.tuple(O.some(o1), os)
              }
            }

            return Tp.tuple(O.some(o1), CK.append_(os, o1))
          }
        )

        return CH.zipRight_(CH.write(newChunk), writer(newLast))
      },
      (cause) => CH.failCause(cause),
      (_) => CH.unit
    )

  return new C.Stream(self.channel[">>>"](writer(O.none)))
}

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine
 * whether two elements are equal.
 *
 * @ets_data_first changesWith_
 */
export function changesWith<A>(equal: EQ.Equal<A>) {
  return <R, E>(self: C.Stream<R, E, A>) => changesWith_(self, equal)
}

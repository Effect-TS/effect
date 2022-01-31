// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Finds the first element emitted by this stream that satisfies the provided effectful predicate.
 */
export function findEffect_<R, R1, E, E1, A>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, boolean>
): C.Stream<R & R1, E | E1, A> {
  const loop: CH.Channel<
    R1,
    E,
    CK.Chunk<A>,
    unknown,
    E | E1,
    CK.Chunk<A>,
    any
  > = CH.readWith(
    (in_) =>
      CH.unwrap(
        T.map_(
          CK.findEffect_(in_, f),
          O.fold(
            () => loop,
            (i) => CH.write(CK.single(i))
          )
        )
      ),
    (e) => CH.fail(e),
    (_) => CH.unit
  )

  return new C.Stream(self.channel[">>>"](loop))
}

/**
 * Finds the first element emitted by this stream that satisfies the provided effectful predicate.
 * @ets_data_first findEffect_
 */
export function findEffect<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: C.Stream<R, E, A>) => findEffect_(self, f)
}

// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type { Predicate, Refinement } from "../../../../Function/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Finds the first element emitted by this stream that satisfies the provided predicate.
 */
export function find_<R, E, A, B extends A>(
  self: C.Stream<R, E, A>,
  f: Refinement<A, B>
): C.Stream<R, E, B>
export function find_<R, E, A>(
  self: C.Stream<R, E, A>,
  f: Predicate<A>
): C.Stream<R, E, A>
export function find_<R, E, A>(
  self: C.Stream<R, E, A>,
  f: Predicate<A>
): C.Stream<R, E, A> {
  const loop: CH.Channel<R, E, CK.Chunk<A>, unknown, E, CK.Chunk<A>, any> = CH.readWith(
    (in_) =>
      O.fold_(
        CK.find_(in_, f),
        () => loop,
        (i) => CH.write(CK.single(i))
      ),
    (e) => CH.fail(e),
    (_) => CH.unit
  )

  return new C.Stream(self.channel[">>>"](loop))
}

/**
 * Finds the first element emitted by this stream that satisfies the provided predicate.
 * @ets_data_first find_
 */
export function find<A>(f: Predicate<A>) {
  return <R, E>(self: C.Stream<R, E, A>) => find_(self, f)
}

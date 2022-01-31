// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import type * as Tp from "../../../../Collections/Immutable/Tuple"
import * as O from "../../../../Option"
import * as CH from "../../Channel"
import * as C from "../core.js"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 */
export function unfoldChunk<S, A>(
  s: S,
  f: (s: S) => O.Option<Tp.Tuple<[CK.Chunk<A>, S]>>
): C.UIO<A> {
  const loop = (
    s: S
  ): CH.Channel<unknown, unknown, unknown, unknown, never, CK.Chunk<A>, any> =>
    O.fold_(
      f(s),
      () => CH.end(undefined),
      ({ tuple: [as, s] }) => CH.zipRight_(CH.write(as), loop(s))
    )

  return new C.Stream(loop(s))
}

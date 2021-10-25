// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import type * as Tp from "../../../../Collections/Immutable/Tuple"
import * as T from "../../../../Effect"
import * as O from "../../../../Option"
import * as CH from "../../Channel"
import * as C from "../core"

function unfoldChunksLoop<S, R, E, A>(
  s: S,
  f: (s: S) => T.Effect<R, E, O.Option<Tp.Tuple<[CK.Chunk<A>, S]>>>
): CH.Channel<R, unknown, unknown, unknown, E, CK.Chunk<A>, unknown> {
  return CH.unwrap(
    T.map_(
      f(s),
      O.fold(
        () => CH.unit,
        ({ tuple: [as, s] }) => CH.chain_(CH.write(as), () => unfoldChunksLoop(s, f))
      )
    )
  )
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunksEffect<R, E, A, S>(
  s: S,
  f: (s: S) => T.Effect<R, E, O.Option<Tp.Tuple<[CK.Chunk<A>, S]>>>
): C.Stream<R, E, A> {
  return new C.Stream(unfoldChunksLoop(s, f))
}

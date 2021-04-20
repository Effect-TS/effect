// tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import type * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Like `unfoldChunkM`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunkM<S, R, E, A>(
  s: S,
  f: (s: S) => T.Effect<R, E, Tp.Tuple<[A.Chunk<A>, O.Option<S>]>>
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bind("ref", () => T.toManaged(Ref.makeRef(O.some(s)))),
      M.map(({ ref }) =>
        T.chain_(
          ref.get,
          O.fold(
            () => Pull.end,
            (s) =>
              T.foldM_(f(s), Pull.fail, ({ tuple: [as, s] }) => T.as_(ref.set(s), as))
          )
        )
      )
    )
  )
}

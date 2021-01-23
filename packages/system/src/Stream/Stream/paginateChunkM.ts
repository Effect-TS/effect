import * as A from "../../Chunk"
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
export function paginateChunkM<S>(s: S) {
  return <R, E, A>(
    f: (s: S) => T.Effect<R, E, readonly [A.Chunk<A>, O.Option<S>]>
  ): Stream<R, E, A> =>
    new Stream(
      pipe(
        M.do,
        M.bind("ref", () => T.toManaged_(Ref.makeRef(O.some(s)))),
        M.map(({ ref }) =>
          T.chain_(
            ref.get,
            O.fold(
              () => Pull.end,
              (s) => T.foldM_(f(s), Pull.fail, ([as, s]) => T.as_(ref.set(s), as))
            )
          )
        )
      )
    )
}

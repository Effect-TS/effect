import * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { unfoldChunkM } from "./unfoldChunkM"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldM<S>(s: S) {
  return <R, E, A>(
    f: (s: S) => T.Effect<R, E, O.Option<readonly [A, S]>>
  ): Stream<R, E, A> =>
    unfoldChunkM(s)((_) =>
      T.map_(
        f(_),
        O.map(([a, s]) => [[a], s] as const)
      )
    )
}

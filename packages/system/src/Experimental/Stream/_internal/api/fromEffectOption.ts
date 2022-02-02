// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import * as O from "../../../../Option"
import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function fromEffectOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
): C.Stream<R, E, A> {
  return new C.Stream(
    CH.unwrap(
      T.fold_(
        fa,
        O.fold(
          () => CH.end(undefined),
          (e) => CH.fail(e)
        ),
        (a) => CH.write(CK.single(a))
      )
    )
  )
}

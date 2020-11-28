import type * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export function repeatEffectChunkOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A.Array<A>>
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bind("done", () => Ref.makeManagedRef(false)),
      M.let("pull", ({ done }) =>
        pipe(
          done.get,
          T.chain((b) =>
            b
              ? Pull.end
              : pipe(
                  fa,
                  T.tapError(
                    O.fold(
                      () => done.set(true),
                      () => T.unit
                    )
                  )
                )
          )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )
}

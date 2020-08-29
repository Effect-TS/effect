import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as R from "../../Ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export const repeatEffectChunkOption = <S, R, E, A>(
  fa: T.Effect<S, R, O.Option<E>, A.Array<A>>
): Stream<S, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("done", () => R.makeManagedRef(false)),
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

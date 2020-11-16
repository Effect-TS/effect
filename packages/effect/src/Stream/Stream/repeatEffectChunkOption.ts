import type * as Array from "../../Array"
import { pipe } from "../../Function"
import * as Option from "../../Option"
import * as Ref from "../../Ref"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export const repeatEffectChunkOption = <R, E, A>(
  fa: T.Effect<R, Option.Option<E>, Array.Array<A>>
): Stream<R, E, A> =>
  new Stream(
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
                    Option.fold(
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

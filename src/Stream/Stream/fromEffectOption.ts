import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { pipe } from "../../Function"
import type * as O from "../../Option"
import * as R from "../../Ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export const fromEffectOption = <S, R, E, A>(
  fa: T.Effect<S, R, O.Option<E>, A>
): Stream<S, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("doneRef", () => pipe(R.makeRef(false), T.toManaged())),
      M.let("pull", ({ doneRef }) =>
        pipe(
          doneRef,
          R.modify((b) =>
            b
              ? [Pull.end, true]
              : [
                  pipe(
                    fa,
                    T.map((a) => [a])
                  ),
                  true
                ]
          ),
          T.flatten
        )
      ),
      M.map(({ pull }) => pull)
    )
  )

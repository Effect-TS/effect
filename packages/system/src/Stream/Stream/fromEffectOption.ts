import { pipe } from "../../Function"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function fromEffectOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bind("doneRef", () => pipe(Ref.makeRef(false), T.toManaged())),
      M.let("pull", ({ doneRef }) =>
        pipe(
          doneRef,
          Ref.modify((b) =>
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
}

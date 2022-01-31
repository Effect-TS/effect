// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function fromEffectOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bind("doneRef", () => pipe(Ref.makeRef(false), T.toManaged)),
      M.let("pull", ({ doneRef }) =>
        pipe(
          doneRef,
          Ref.modify((b) =>
            b
              ? Tp.tuple(Pull.end, true)
              : Tp.tuple(
                  pipe(
                    fa,
                    T.map((a) => A.single(a))
                  ),
                  true
                )
          ),
          T.flatten
        )
      ),
      M.map(({ pull }) => pull)
    )
  )
}

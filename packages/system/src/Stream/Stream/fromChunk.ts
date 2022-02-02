// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import type { UIO } from "./definitions.js"
import { Stream } from "./definitions.js"

/**
 * Creates a stream from an array of values
 */
export function fromChunk<O>(c: A.Chunk<O>): UIO<O> {
  return new Stream(
    pipe(
      T.do,
      T.bind("doneRef", () => Ref.makeRef(false)),
      T.let("pull", ({ doneRef }) =>
        pipe(
          doneRef,
          Ref.modify<T.IO<O.Option<never>, A.Chunk<O>>, boolean>((done) =>
            done || A.isEmpty(c)
              ? Tp.tuple(Pull.end, true)
              : Tp.tuple(T.succeed(c), true)
          ),
          T.flatten
        )
      ),
      T.map(({ pull }) => pull),
      T.toManaged
    )
  )
}

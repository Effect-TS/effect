// tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import type { UIO } from "./definitions"
import { Stream } from "./definitions"

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

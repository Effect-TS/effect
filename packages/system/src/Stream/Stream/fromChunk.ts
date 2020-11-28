import type * as A from "../../Array"
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
export function fromChunk<O>(c: A.Array<O>): UIO<O> {
  return new Stream(
    pipe(
      T.do,
      T.bind("doneRef", () => Ref.makeRef(false)),
      T.let("pull", ({ doneRef }) =>
        pipe(
          doneRef,
          Ref.modify<T.IO<O.Option<never>, A.Array<O>>, boolean>((done) =>
            done || c.length === 0 ? [Pull.end, true] : [T.succeed(c), true]
          ),
          T.flatten
        )
      ),
      T.map(({ pull }) => pull),
      T.toManaged()
    )
  )
}

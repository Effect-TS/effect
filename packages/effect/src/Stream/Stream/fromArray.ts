import * as T from "../_internal/effect"
import type * as Array from "../../Array"
import { pipe } from "../../Function"
import type * as Option from "../../Option"
import * as Ref from "../../Ref"
import * as Pull from "../Pull"
import type { UIO } from "./definitions"
import { Stream } from "./definitions"

/**
 * Creates a stream from an array of values
 */
export const fromArray = <O>(c: Array.Array<O>): UIO<O> =>
  new Stream(
    pipe(
      Ref.makeRef(false),
      T.chain(
        Ref.modify<T.IO<Option.Option<never>, Array.Array<O>>, boolean>((done) =>
          done || c.length === 0 ? [Pull.end, true] : [T.succeed(c), true]
        )
      ),
      T.toManaged()
    )
  )

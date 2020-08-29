import * as T from "../_internal/effect"
import type * as Array from "../../Array"
import { pipe } from "../../Function"
import type * as Option from "../../Option"
import * as Ref from "../../Ref"
import * as Pull from "../Pull"
import type { Sync } from "./definitions"
import { Stream } from "./definitions"

/**
 * Creates a stream from an array of values
 */
export const fromArray = <O>(c: Array.Array<O>): Sync<O> =>
  new Stream(
    pipe(
      Ref.makeRef(false),
      T.map((doneRef) =>
        pipe(
          doneRef,
          Ref.modify((done): [T.SyncE<Option.Option<never>, Array.Array<O>>, boolean] =>
            done || c.length === 0 ? [Pull.end, true] : [T.succeedNow(c), true]
          ),
          T.flatten
        )
      ),
      T.toManaged()
    )
  )

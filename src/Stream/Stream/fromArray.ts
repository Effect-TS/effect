import * as T from "../_internal/effect"
import type * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as R from "../../Ref"
import * as Pull from "../Pull"
import type { Sync } from "./definitions"
import { Stream } from "./definitions"

/**
 * Creates a stream from an array of values
 */
export const fromArray = <O>(c: A.Array<O>): Sync<O> =>
  new Stream(
    pipe(
      R.makeRef(false),
      T.map((doneRef) =>
        pipe(
          doneRef,
          R.modify((done): [T.SyncE<O.Option<never>, A.Array<O>>, boolean] =>
            done || c.length === 0 ? [Pull.end, true] : [T.succeedNow(c), true]
          ),
          T.flatten
        )
      ),
      T.toManaged()
    )
  )

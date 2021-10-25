// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple"
import type { Predicate } from "../../../../Function"
import * as Ref from "../../../../Ref"
import * as C from "../core"
import * as ReadWith from "./readWith"
import * as Unwrap from "./unwrap"
import * as ZipRight from "./zipRight"

/**
 * Creates a channel backed by a buffer. When the buffer is empty, the channel will simply
 * passthrough its input as output. However, when the buffer is non-empty, the value inside
 * the buffer will be passed along as output.
 */
export function buffer<InElem, InErr, InDone>(
  empty: InElem,
  isEmpty: Predicate<InElem>,
  ref: Ref.Ref<InElem>
): C.Channel<unknown, InErr, InElem, InDone, InErr, InElem, InDone> {
  return Unwrap.unwrap(
    Ref.modify_(ref, (v) => {
      if (isEmpty(v)) {
        return Tp.tuple(
          ReadWith.readWith(
            (_in) => ZipRight.zipRight_(C.write(_in), buffer(empty, isEmpty, ref)),
            (err) => C.fail(err),
            (done) => C.end(done)
          ),
          v
        )
      } else {
        return Tp.tuple(
          ZipRight.zipRight_(C.write(v), buffer(empty, isEmpty, ref)),
          empty
        )
      }
    })
  )
}

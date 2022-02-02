// ets_tracing: off

import * as C from "../core"
import * as ReadWith from "./readWith"
import * as ZipRight from "./zipRight"

export function identity<Err, Elem, Done>(): C.Channel<
  unknown,
  Err,
  Elem,
  Done,
  Err,
  Elem,
  Done
> {
  return ReadWith.readWith(
    (_in) => ZipRight.zipRight_(C.write(_in), identity<Err, Elem, Done>()),
    (err) => C.fail(err),
    (done) => C.end(done)
  )
}

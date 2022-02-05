// ets_tracing: off

import * as C from "../core.js"
import * as Unwrap from "./unwrap.js"
import * as ZipRight from "./zipRight.js"

export function fromInput<Err, Elem, Done>(
  input: C.AsyncInputConsumer<Err, Elem, Done>
): C.Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return Unwrap.unwrap(
    input.takeWith(
      (_) => C.failCause(_),
      (_) => ZipRight.zipRight_(C.write(_), fromInput(input)),
      (_) => C.end(_)
    )
  )
}

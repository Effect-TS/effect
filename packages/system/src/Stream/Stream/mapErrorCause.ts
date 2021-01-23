import * as C from "../../Cause"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause_<R, E, E2, O>(
  self: Stream<R, E, O>,
  f: (e: C.Cause<E>) => C.Cause<E2>
): Stream<R, E2, O> {
  return new Stream(
    pipe(
      self.proc,
      M.map(
        T.mapErrorCause((x) =>
          pipe(
            C.sequenceCauseOption(x),
            O.fold(
              () => C.fail(O.none),
              (c) => pipe(f(c), C.map(O.some))
            )
          )
        )
      )
    )
  )
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause<E, E2>(f: (e: C.Cause<E>) => C.Cause<E2>) {
  return <R, O>(self: Stream<R, E, O>) => mapErrorCause_(self, f)
}

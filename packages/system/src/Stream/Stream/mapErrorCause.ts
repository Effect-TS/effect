import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as C from "../../Cause/core"
import { pipe } from "../../Function"
import * as Option from "../../Option"
import { Stream } from "./definitions"

/**
 * Transforms the full causes of failures emitted by this stream.
 */

export const mapErrorCause = <E, E2>(f: (e: C.Cause<E>) => C.Cause<E2>) => <S, R, O>(
  self: Stream<S, R, E, O>
): Stream<S, R, E2, O> =>
  new Stream(
    pipe(
      self.proc,
      M.map(
        T.mapErrorCause((x) =>
          pipe(
            C.sequenceCauseOption(x),
            Option.fold(
              () => C.Fail(Option.none),
              (c) => pipe(f(c), C.map(Option.some))
            )
          )
        )
      )
    )
  )

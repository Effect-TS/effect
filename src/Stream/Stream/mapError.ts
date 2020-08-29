import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { pipe } from "../../Function"
import * as O from "../../Option"
import { Stream } from "./definitions"

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export const mapError = <E, E2>(f: (e: E) => E2) => <S, R, O>(
  self: Stream<S, R, E, O>
): Stream<S, R, E2, O> => new Stream(pipe(self.proc, M.map(T.mapError(O.map(f)))))

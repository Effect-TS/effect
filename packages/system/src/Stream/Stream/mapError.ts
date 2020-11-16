import { pipe } from "../../Function"
import * as Option from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export const mapError = <E, E2>(f: (e: E) => E2) => <R, O>(
  self: Stream<R, E, O>
): Stream<R, E2, O> => new Stream(pipe(self.proc, M.map(T.mapError(Option.map(f)))))

import * as T from "../_internal/effect"
import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { foreach } from "./foreach"

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runDrain = <S, R, E, O>(
  self: Stream<S, R, E, O>
): T.Effect<S, R, E, void> =>
  pipe(
    self,
    foreach((_) => T.unit)
  )

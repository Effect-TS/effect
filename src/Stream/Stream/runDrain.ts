import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { foreach } from "./foreach"

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runDrain = <R, E, O>(self: Stream<R, E, O>): T.Effect<R, E, void> =>
  pipe(
    self,
    foreach((_) => T.unit)
  )

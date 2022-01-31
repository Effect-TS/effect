// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { forEach } from "./forEach.js"

/**
 * Runs the stream and collects all of its elements to an array.
 */
export function runDrain<R, E, O>(self: Stream<R, E, O>): T.Effect<R, E, void> {
  return pipe(
    self,
    forEach((_) => T.unit)
  )
}

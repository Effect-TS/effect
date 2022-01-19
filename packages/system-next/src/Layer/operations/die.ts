import * as Cause from "../../Cause/definition"
import type { Layer } from "../definition"
import { failCause } from "./failCause"

/**
 * Constructs a layer that dies with the specified throwable.
 */
export function die(defect: unknown): Layer<unknown, never, never> {
  return failCause(Cause.die(defect))
}

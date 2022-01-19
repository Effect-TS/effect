import * as Cause from "../../Cause/definition"
import type { Layer } from "../definition"
import { failCause } from "./failCause"

/**
 * Constructs a layer that fails with the specified error.
 */
export function fail<E>(e: E): Layer<unknown, E, never> {
  return failCause(Cause.fail(e))
}

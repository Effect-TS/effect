import type * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { drain } from "./drain"
import { fromEffect } from "./fromEffect"

/**
 * Creates a stream that executes the specified effect but emits no elements.
 */
export function execute<R, E, Z>(effect: T.Effect<R, E, Z>): Stream<R, E, never> {
  return drain(fromEffect(effect))
}

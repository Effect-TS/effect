import * as T from "./deps"
import { fromEffect } from "./fromEffect"

/**
 * Lift a pure value into an effect
 */
export function succeed<A>(a: A) {
  return fromEffect(T.succeed(a))
}

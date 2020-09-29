import * as A from "../Array"
import * as NEA from "../NonEmptyArray"
import type { Effect } from "./effect"
import { orElse_ } from "./orElse"

/**
 * Returns an effect that yields the value of the first
 * effect to succeed.
 */
export function firstSuccessOf<R, E, A>(effects: NEA.NonEmptyArray<Effect<R, E, A>>) {
  const first = NEA.head(effects)
  const rest = NEA.tail(effects)

  return A.reduce_(rest, first, (b, a) => orElse_(b, () => a))
}

import { asUnit } from "./asUnit"
import { chain_, suspend, unit } from "./core"
import type { Effect } from "./effect"

/**
 * The moral equivalent of `if (!p) exp`
 */
export function unless(b: () => boolean) {
  return <R, E, A>(self: Effect<R, E, A>) => suspend(() => (b() ? unit : asUnit(self)))
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects
 */
export function unlessM<R2, E2>(b: Effect<R2, E2, boolean>) {
  return <R, E, A>(self: Effect<R, E, A>) => chain_(b, (_) => (_ ? unit : asUnit(self)))
}

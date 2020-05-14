import type { Ord } from "../../Ord"

import { toReadonlyArray } from "./toReadonlyArray"

/**
 * @since 2.5.0
 */
export function reduce<A>(
  O: Ord<A>
): <B>(b: B, f: (b: B, a: A) => B) => (fa: ReadonlySet<A>) => B {
  const toArrayO = toReadonlyArray(O)
  return (b, f) => (fa) => toArrayO(fa).reduce(f, b)
}

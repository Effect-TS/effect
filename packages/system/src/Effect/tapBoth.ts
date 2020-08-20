import type { Effect } from "./effect"
import { tapBoth_ } from "./tapBoth_"

/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 */
export const tapBoth = <E, A, S2, R2, E2, S3, R3, E3>(
  f: (e: E) => Effect<S2, R2, E2, any>,
  g: (a: A) => Effect<S3, R3, E3, any>
) => <S, R>(self: Effect<S, R, E, A>) => tapBoth_(self, f, g)

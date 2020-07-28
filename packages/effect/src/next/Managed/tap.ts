import { chain_ } from "./chain_"
import { Managed } from "./managed"
import { map_ } from "./map_"

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export const tap = <A, S2, R2, E2>(f: (a: A) => Managed<S2, R2, E2, any>) => <S, R, E>(
  self: Managed<S, R, E, A>
) => chain_(self, (a) => map_(f(a), () => a))

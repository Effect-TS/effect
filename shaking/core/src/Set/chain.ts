import type { Eq } from "../Eq"
import { chain as chain_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const chain: <B>(
  E: Eq<B>
) => <A>(f: (x: A) => Set<B>) => (set: Set<A>) => Set<B> = chain_1 as any

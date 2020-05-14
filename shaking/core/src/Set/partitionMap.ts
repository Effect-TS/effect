import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import type { Eq } from "../Eq"
import { partitionMap as partitionMap_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const partitionMap: <B, C>(
  EB: Eq<B>,
  EC: Eq<C>
) => <A>(
  f: (a: A) => Either<B, C>
) => (set: Set<A>) => Separated<Set<B>, Set<C>> = partitionMap_1 as any

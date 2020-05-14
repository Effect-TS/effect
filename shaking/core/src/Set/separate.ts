import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import type { Eq } from "../Eq"
import { separate as separate_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */

export const separate: <E, A>(
  EE: Eq<E>,
  EA: Eq<A>
) => (fa: Set<Either<E, A>>) => Separated<Set<E>, Set<A>> = separate_1 as any

import { Exit } from "../Exit/exit"

import { bracketExit_ } from "./bracketExit_"
import { Effect } from "./effect"

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 */
export const bracketExit = <A, S1, E1, R1, A1, S2, R2, E2, A2>(
  release: (a: A, e: Exit<E1, A1>) => Effect<S2, R2, E2, A2>,
  use: (a: A) => Effect<S1, R1, E1, A1>
) => <S, R, E>(
  acquire: Effect<S, R, E, A>
): Effect<S | S1 | S2, R & R1 & R2, E | E1 | E2, A1> =>
  bracketExit_(acquire, release, use)

import { Then } from "../Cause/cause"
import { Exit } from "../Exit/exit"
import { fold_ } from "../Exit/fold_"

import { chain_ } from "./chain_"
import { done } from "./done"
import { Effect } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { halt } from "./halt"
import { result } from "./result"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * Neither the acquisition nor the release will be interrupted, and the
 * resource is guaranteed to be released, so long as the `acquire` effect
 * succeeds. If `use` fails, then after release, the returned effect will fail
 * with the same error.
 */
export const bracketExit_ = <S, R, E, A, S1, E1, R1, A1, S2, R2, E2, A2>(
  acquire: Effect<S, R, E, A>,
  use: (a: A) => Effect<S1, R1, E1, A1>,
  release: (a: A, e: Exit<E1, A1>) => Effect<S2, R2, E2, A2>
): Effect<S | S1 | S2, R & R1 & R2, E | E1 | E2, A1> =>
  uninterruptibleMask(({ restore }) =>
    chain_(acquire, (a) =>
      chain_(result(restore(use(a))), (e) =>
        foldCauseM_(
          release(a, e),
          (cause2) =>
            halt(
              fold_(
                e,
                (_) => Then(_, cause2),
                (_) => cause2
              )
            ),
          (_) => done(e)
        )
      )
    )
  )

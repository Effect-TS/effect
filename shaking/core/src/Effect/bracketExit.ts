import { FunctionN } from "fp-ts/lib/function"

import { Exit } from "../Exit"
import { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { combineFinalizerExit } from "./combineFinalizerExit"
import { completed } from "./completed"
import { result } from "./result"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Resource acquisition and release construct.
 *
 * Once acquire completes successfully, release is guaranteed to execute following the evaluation of the IO produced by use.
 * Release receives the exit state of use along with the resource.
 * @param acquire
 * @param release
 * @param use
 */
export function bracketExit<S, R, E, A, B, S2, R2, E2, S3, R3, E3>(
  acquire: Effect<S, R, E, A>,
  release: FunctionN<[A, Exit<E | E3, B>], Effect<S2, R2, E2, unknown>>,
  use: FunctionN<[A], Effect<S3, R3, E3, B>>
): Effect<S | S2 | S3, R & R2 & R3, E | E2 | E3, B> {
  return uninterruptibleMask((cutout) =>
    chain_(acquire, (a) =>
      chain_(result(cutout(use(a))), (exit) =>
        chain_(result(release(a, exit as Exit<E | E3, B>)), (finalize) =>
          completed(combineFinalizerExit(exit, finalize))
        )
      )
    )
  )
}

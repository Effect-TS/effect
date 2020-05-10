import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { bracketExit } from "./bracketExit"

/**
 * Weaker form of bracketExit where release does not receive the exit status of use
 * @param acquire
 * @param release
 * @param use
 */
export function bracket<S, R, E, A, S2, R2, E2, S3, R3, E3, B>(
  acquire: Effect<S, R, E, A>,
  release: FunctionN<[A], Effect<S2, R2, E2, unknown>>,
  use: FunctionN<[A], Effect<S3, R3, E3, B>>
): Effect<S | S2 | S3, R & R2 & R3, E | E2 | E3, B> {
  // tslint:disable-next-line: no-unnecessary-callback-wrapper
  return bracketExit(acquire, (e) => release(e), use)
}

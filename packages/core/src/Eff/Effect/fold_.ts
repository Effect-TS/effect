import { Effect } from "./effect"
import { foldM_ } from "./foldM_"
import { succeedNow } from "./succeedNow"

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export const fold_ = <S, R, E, A, A2, A3>(
  value: Effect<S, R, E, A>,
  failure: (failure: E) => A2,
  success: (a: A) => A3
): Effect<S, R, never, A2 | A3> =>
  foldM_(
    value,
    (e) => succeedNow(failure(e)),
    (a) => succeedNow(success(a))
  )

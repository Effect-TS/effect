import * as T from "./deps"
import { Managed } from "./managed"

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const chain_ = <S, R, E, A, S2, R2, E2, A2>(
  self: Managed<S, R, E, A>,
  f: (a: A) => Managed<S2, R2, E2, A2>
) =>
  new Managed<S | S2, R & R2, E | E2, A2>(
    T.chain_(self.effect, ([releaseSelf, a]) =>
      T.map_(f(a).effect, ([releaseThat, b]) => [
        (e) =>
          T.chain_(T.result(releaseThat(e)), (e1) =>
            T.chain_(T.result(releaseSelf(e1)), (e2) => T.done(T.exitZipRight_(e1, e2)))
          ),
        b
      ])
    )
  )

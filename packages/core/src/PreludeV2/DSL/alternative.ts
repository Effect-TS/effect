// ets_tracing: off

import { pipe } from "../../Function"
import type { AssociativeEither } from "../AssociativeEither"
import type { Covariant } from "../Covariant"
import type { HKT, Kind } from "../HKT"

// @todo(warn): original requires fa to be Kind<R2, E2, A>, not Kind<R, E, A>
export function orElseF<F extends HKT>(
  F_: Covariant<F>,
  A_: AssociativeEither<F>
): <X, I2, R2, E2, B>(
  fb: () => Kind<F, X, I2, R2, E2, B>
) => <I, R, E, A>(
  fa: Kind<F, X, I, R, E, A>
) => Kind<F, X, I & I2, R2 & R, E2 | E, A | B> {
  return (fb) => (fa) =>
    pipe(
      fa,
      A_.orElseEither(fb),
      F_.map((e) => (e._tag === "Left" ? e.left : e.right))
    )
}

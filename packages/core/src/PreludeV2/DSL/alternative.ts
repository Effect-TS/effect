// ets_tracing: off

import { pipe } from "../../Function/index.js"
import type { AssociativeEither } from "../AssociativeEither/index.js"
import type { Covariant } from "../Covariant/index.js"
import type { HKT, Kind } from "../HKT/index.js"

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

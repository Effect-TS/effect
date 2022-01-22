// ets_tracing: off

import { pipe } from "../../Function/index.js"
import type { AssociativeEither } from "../AssociativeEither/index.js"
import type { Covariant } from "../Covariant/index.js"
import type { HKT, Kind } from "../HKT/index.js"

export function orElseF<F extends HKT>(
  F_: Covariant<F> & AssociativeEither<F>
): <R2, E2, B>(
  fb: () => Kind<F, R2, E2, B>
) => <I, R, E, A>(fa: Kind<F, R, E, A>) => Kind<F, R2 & R, E2 | E, A | B> {
  return (fb) => (fa) =>
    pipe(
      fa,
      F_.orElseEither(fb),
      F_.map((e) => (e._tag === "Left" ? e.left : e.right))
    )
}

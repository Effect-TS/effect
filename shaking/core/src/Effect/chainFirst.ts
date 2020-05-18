import { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { map_ } from "./map"

export const chainFirst: <S1, R, E, A, B>(
  f: (a: A) => Effect<S1, R, E, B>
) => <S2, R2, E2>(ma: Effect<S2, R2, E2, A>) => Effect<S1 | S2, R & R2, E | E2, A> = (
  f
) => (ma) => chain_(ma, (x) => map_(f(x), () => x))

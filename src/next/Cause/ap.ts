import { pipe } from "../../Function"

import { Cause } from "./cause"
import { chain } from "./chain"
import { map } from "./map"

/**
 * Applicative's ap
 */
export const ap: <A>(fa: Cause<A>) => <B>(fab: Cause<(a: A) => B>) => Cause<B> = (fa) =>
  chain((f) => pipe(fa, map(f)))

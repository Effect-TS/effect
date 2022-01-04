// ets_tracing: off

import type { Exit } from "../definition"
import { chain_ } from "./chain"
import { map_ } from "./map"

/**
 * Applicative's ap
 */
export function ap_<E, A, B>(fa: Exit<E, A>, fab: Exit<E, (a: A) => B>): Exit<E, B> {
  return chain_(fab, (f) => map_(fa, (a) => f(a)))
}

/**
 * Applicative's ap
 *
 * @ets_data_first ap_
 */
export function ap<E, A>(fa: Exit<E, A>) {
  return <B>(fab: Exit<E, (a: A) => B>): Exit<E, B> => ap_(fa, fab)
}

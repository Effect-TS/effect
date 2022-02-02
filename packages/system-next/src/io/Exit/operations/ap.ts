import type { Exit } from "../definition"

/**
 * Applicative's ap.
 *
 * @tsplus fluent ets/Exit ap
 */
export function ap_<E, A, B>(fa: Exit<E, A>, fab: Exit<E, (a: A) => B>): Exit<E, B> {
  return fab.flatMap((f) => fa.map((a) => f(a)))
}

/**
 * Applicative's ap.
 *
 * @ets_data_first ap_
 */
export function ap<E, A>(fa: Exit<E, A>) {
  return <B>(fab: Exit<E, (a: A) => B>): Exit<E, B> => fa.ap(fab)
}

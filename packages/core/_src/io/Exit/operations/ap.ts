/**
 * Applicative's ap.
 *
 * @tsplus fluent ets/Exit ap
 */
export function ap_<E, A, B>(fa: Exit<E, A>, fab: Exit<E, (a: A) => B>): Exit<E, B> {
  return fab.flatMap((f) => fa.map((a) => f(a)));
}

/**
 * Applicative's ap.
 *
 * @tsplus static ets/Exit/Aspects ap
 */
export const ap = Pipeable(ap_);

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @tsplus fluent ets/Effect unrefine
 */
export function unrefine_<R, E, A, E1>(
  self: Effect<R, E, A>,
  pf: (u: unknown) => Option<E1>,
  __tsplusTrace?: string
) {
  return self.unrefineWith(pf, identity);
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @tsplus static ets/Effect/Aspects unrefine
 */
export const unrefine = Pipeable(unrefine_);

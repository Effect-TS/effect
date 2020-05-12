import type { Predicate } from "../../Function"

export const filter_ = <A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): ReadonlyArray<A> => {
  return as.filter(predicate)
}

import type { Predicate } from "../../Function"

export const spanIndexUncurry = <A>(
  as: ReadonlyArray<A>,
  predicate: Predicate<A>
): number => {
  const l = as.length
  let i = 0
  for (; i < l; i++) {
    if (!predicate(as[i])) {
      break
    }
  }
  return i
}

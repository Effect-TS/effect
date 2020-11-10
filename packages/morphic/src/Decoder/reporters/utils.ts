import type { Predicate } from "@effect-ts/core/Function"

export const takeUntil = <A = unknown>(predicate: Predicate<A>) => (
  as: ReadonlyArray<A>
): ReadonlyArray<A> => {
  const init = []

  for (let i = 0; i < as.length; i++) {
    init[i] = as[i]
    if (predicate(as[i])) {
      return init
    }
  }

  return init
}

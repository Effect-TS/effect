import type { Predicate, Refinement } from "../../Function"

import { filter_ } from "./filter_"

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <E>(
    fa: ReadonlyMap<E, A>
  ) => ReadonlyMap<E, B>
  <A>(predicate: Predicate<A>): <E>(fa: ReadonlyMap<E, A>) => ReadonlyMap<E, A>
} = <A>(predicate: Predicate<A>) => <E>(fa: ReadonlyMap<E, A>): ReadonlyMap<E, A> =>
  filter_(fa, predicate)

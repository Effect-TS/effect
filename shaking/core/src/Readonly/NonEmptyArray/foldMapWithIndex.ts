import type { Semigroup } from "../../Semigroup"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const foldMapWithIndex = <S>(S: Semigroup<S>) => <A>(
  f: (i: number, a: A) => S
) => (fa: ReadonlyNonEmptyArray<A>) =>
  fa.slice(1).reduce((s, a, i) => S.concat(s, f(i + 1, a)), f(0, fa[0]))

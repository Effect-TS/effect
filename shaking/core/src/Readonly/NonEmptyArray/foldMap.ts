import type { Semigroup } from "../../Semigroup"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const foldMap = <S>(S: Semigroup<S>) => <A>(f: (a: A) => S) => (
  fa: ReadonlyNonEmptyArray<A>
) => fa.slice(1).reduce((s, a) => S.concat(s, f(a)), f(fa[0]))

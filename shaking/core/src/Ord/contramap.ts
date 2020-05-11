import type { Ord } from "./Ord"
import { fromCompare } from "./fromCompare"

export const contramap: <A, B>(f: (b: B) => A) => (fa: Ord<A>) => Ord<B> = (f) => (
  fa
) => contramap_(fa, f)

export const contramap_: <A, B>(fa: Ord<A>, f: (b: B) => A) => Ord<B> = (fa, f) =>
  fromCompare((x, y) => fa.compare(f(x), f(y)))

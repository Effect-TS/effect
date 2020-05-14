import type { Const } from "./Const"
import { make } from "./make"

export const bimap_: <E, A, G, B>(
  fea: Const<E, A>,
  f: (e: E) => G,
  g: (a: A) => B
) => Const<G, B> = (fea, f) => make(f(fea))

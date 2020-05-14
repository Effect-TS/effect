import type { Const } from "./Const"
import { make } from "./make"

export const mapLeft_: <E, A, G>(fea: Const<E, A>, f: (e: E) => G) => Const<G, A> = (
  fea,
  f
) => make(f(fea))

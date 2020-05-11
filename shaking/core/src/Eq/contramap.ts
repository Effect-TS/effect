import type { Eq } from "./Eq"
import { fromEquals } from "./fromEquals"

export const contramap_: <A, B>(fa: Eq<A>, f: (b: B) => A) => Eq<B> = (fa, f) =>
  fromEquals((x, y) => fa.equals(f(x), f(y)))

export const contramap: <A, B>(f: (b: B) => A) => (fa: Eq<A>) => Eq<B> = (f) => (fa) =>
  contramap_(fa, f)

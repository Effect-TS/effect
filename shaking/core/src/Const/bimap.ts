import type { Const } from "./Const"
import { bimap_ } from "./bimap_"

export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => (fa: Const<E, A>) => Const<G, B> = (f, g) => (fa) => bimap_(fa, f, g)

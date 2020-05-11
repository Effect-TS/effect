import type { Either } from "./Either"
import { isLeft } from "./isLeft"
import { left } from "./left"
import { right } from "./right"

export const bimap_: <E, A, G, B>(
  fea: Either<E, A>,
  f: (e: E) => G,
  g: (a: A) => B
) => Either<G, B> = (fea, f, g) =>
  isLeft(fea) ? left(f(fea.left)) : right(g(fea.right))

export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => (fa: Either<E, A>) => Either<G, B> = (f, g) => (fa) => bimap_(fa, f, g)

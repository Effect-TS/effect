import type { Either } from "./Either"
import { isLeft } from "./isLeft"
import { left } from "./left"

export const mapLeft_: <E, A, G>(fea: Either<E, A>, f: (e: E) => G) => Either<G, A> = (
  fea,
  f
) => (isLeft(fea) ? left(f(fea.left)) : fea)

export const mapLeft: <E, G>(
  f: (e: E) => G
) => <A>(fa: Either<E, A>) => Either<G, A> = (f) => (fa) => mapLeft_(fa, f)

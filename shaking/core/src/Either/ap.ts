import type { Either } from "./Either"
import { isLeft } from "./isLeft"
import { right } from "./right"

export const ap_: <E, A, B, E2>(
  fab: Either<E, (a: A) => B>,
  fa: Either<E2, A>
) => Either<E | E2, B> = (mab, ma) =>
  isLeft(mab) ? mab : isLeft(ma) ? ma : right(mab.right(ma.right))

export const ap: <E, A>(
  fa: Either<E, A>
) => <E2, B>(fab: Either<E2, (a: A) => B>) => Either<E | E2, B> = (fa) => (fab) =>
  ap_(fab, fa)

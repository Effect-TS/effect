import type { Either } from "./Either"
import { extend_ } from "./extend"

export const duplicate: <E, A>(ma: Either<E, A>) => Either<E, Either<E, A>> = (ma) =>
  extend_(ma, (x) => x)

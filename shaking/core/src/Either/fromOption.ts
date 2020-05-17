import { isNone, Option } from "../Option"

import type { Either } from "./Either"
import { left } from "./left"
import { right } from "./right"

export const fromOption: <E>(onNone: () => E) => <A>(ma: Option<A>) => Either<E, A> = (
  onNone
) => (ma) => (isNone(ma) ? left(onNone()) : right(ma.value))

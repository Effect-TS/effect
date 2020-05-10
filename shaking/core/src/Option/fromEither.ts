import type { Either } from "fp-ts/lib/Either"
import type { Option } from "fp-ts/lib/Option"

import { none } from "./none"
import { some } from "./some"

export const fromEither: <E, A>(ma: Either<E, A>) => Option<A> = (ma) =>
  ma._tag === "Left" ? none : some(ma.right)

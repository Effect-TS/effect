import type { Either } from "../Either/Either"
import { traverse } from "../Either/traverse"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseEither: <A, S, R, FE, B>(
  f: (a: A) => Effect<S, R, FE, B>
) => <TE>(ta: Either<TE, A>) => Effect<S, R, FE, Either<TE, B>> = (f) => (ta) =>
  traverse(effect)(ta, f)

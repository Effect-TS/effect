import { Either, traverse_ } from "../Either/either"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseEither_ =
  /*#__PURE__*/
  (() => traverse_(effect))()

export const traverseEither: <A, S, R, FE, B>(
  f: (a: A) => Effect<S, R, FE, B>
) => <TE>(ta: Either<TE, A>) => Effect<S, R, FE, Either<TE, B>> = (f) => (ta) =>
  traverseEither_(ta, f)

import * as O from "../../Option"
import { keepDefects } from "../Cause/keepDefects"

import { Effect } from "./effect"
import { halt } from "./halt"
import { IFold } from "./primitives"

export const tryOrElse_ = <S, R, E, A, S2, R2, E2, A2, S3, R3, E3, A3>(
  self: Effect<S, R, E, A>,
  that: () => Effect<S2, R2, E2, A2>,
  success: (a: A) => Effect<S3, R3, E3, A3>
): Effect<S | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> =>
  new IFold(self, (cause) => O.fold_(keepDefects(cause), that, halt), success)

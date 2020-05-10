import { FunctionN } from "fp-ts/lib/function"

import { Effect } from "../Support/Common/effect"

import { accessEnvironment } from "./accessEnvironment"
import { chain_ } from "./chain"

export function accessM<S, R, R2, E, A>(
  f: FunctionN<[R], Effect<S, R2, E, A>>
): Effect<S, R & R2, E, A> {
  return chain_(accessEnvironment<R>(), f)
}

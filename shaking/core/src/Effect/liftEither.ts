import type { Either } from "../Either/either"
import type { FunctionN } from "../Function"
import type { SyncE } from "../Support/Common/effect"

import { encaseEither } from "./encaseEither"
import { suspended } from "./suspended"

export function liftEither<A, E, B>(
  f: FunctionN<[A], Either<E, B>>
): FunctionN<[A], SyncE<E, B>> {
  return (a) => suspended(() => encaseEither(f(a)))
}

import { Either } from "fp-ts/lib/Either"
import { FunctionN } from "fp-ts/lib/function"

import { SyncE } from "../Support/Common/effect"

import { encaseEither } from "./encaseEither"
import { suspended } from "./suspended"

export function liftEither<A, E, B>(
  f: FunctionN<[A], Either<E, B>>
): FunctionN<[A], SyncE<E, B>> {
  return (a) => suspended(() => encaseEither(f(a)))
}

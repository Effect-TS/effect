import type { TaskEither } from "fp-ts/lib/TaskEither"

import type { FunctionN } from "../Function"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { encaseTaskEither } from "./encaseTaskEither"

export function chainTaskEither<A, E, B>(
  bind: FunctionN<[A], TaskEither<E, B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => AsyncRE<R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseTaskEither(bind(a)))
}

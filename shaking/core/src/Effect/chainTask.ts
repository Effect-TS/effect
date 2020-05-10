import { Task } from "fp-ts/lib/Task"
import { FunctionN } from "fp-ts/lib/function"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { encaseTask } from "./encaseTask"

export function chainTask<A, B>(
  bind: FunctionN<[A], Task<B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => AsyncRE<R, E2, B> {
  return (inner) => chain_(inner, (a) => encaseTask(bind(a)))
}

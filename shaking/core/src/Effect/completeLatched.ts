import { FunctionN } from "fp-ts/lib/function"

import { Deferred } from "../Deferred"
import { Exit } from "../Exit"
import { Ref } from "../Ref"
import { Async, AsyncRE, AsyncR } from "../Support/Common/effect"

import { flatten } from "./chain"
import { Fiber } from "./makeFiber"
import { unit } from "./unit"

export function completeLatched<E1, E2, E3, A, B, C, R>(
  latch: Ref<boolean>,
  channel: Deferred<unknown, R, E3, C>,
  combine: FunctionN<[Exit<E1, A>, Fiber<E2, B>], AsyncRE<R, E3, C>>,
  other: Fiber<E2, B>
): FunctionN<[Exit<E1, A>], AsyncR<R, void>> {
  return (exit) => {
    const act: Async<AsyncR<R, void>> = latch.modify((flag) =>
      !flag
        ? ([channel.from(combine(exit, other)), true] as const)
        : ([unit, flag] as const)
    )
    return flatten(act)
  }
}

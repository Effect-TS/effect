// ets_tracing: off

/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import { _A, _E, _R } from "../../Effect/commons.js"
import type * as Utils from "../../Utils/index.js"
import type { STM } from "./core.js"
import { chain_, succeed, suspend } from "./core.js"

export class GenSTM<R, E, A> {
  readonly [_R]!: (_R: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(readonly effect: STM<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenSTM<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  return new GenSTM(_)
}

/**
 * Do simulation using Generators
 */
export function gen<Eff extends GenSTM<any, any, any>, AEff>(
  f: (i: { <R, E, A>(_: STM<R, E, A>): GenSTM<R, E, A> }) => Generator<Eff, AEff, any>
): STM<Utils._R<Eff>, Utils._E<Eff>, AEff> {
  return suspend(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): STM<any, any, AEff> {
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(state.value["effect"], (val) => {
        const next = iterator.next(val)
        return run(next)
      })
    }

    return run(state)
  })
}

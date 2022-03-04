/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import type * as UT from "../../../data/Utils"
import { _A, _E, _R } from "../../../support/Symbols"
import { STM } from "../definition"

export class GenSTM<R, E, A> {
  readonly [_R]: (_R: R) => void;
  readonly [_E]: () => E;
  readonly [_A]: () => A

  constructor(readonly stm: STM<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenSTM<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  return new GenSTM(_)
}

/**
 * Do simulation using Generators
 *
 * @tsplus static ets/STMOps gen
 */
export function gen<Eff extends GenSTM<any, any, any>, AEff>(
  f: (i: { <R, E, A>(_: STM<R, E, A>): GenSTM<R, E, A> }) => Generator<Eff, AEff, any>
): STM<UT._R<Eff>, UT._E<Eff>, AEff> {
  return STM.suspend(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): STM<any, any, AEff> {
      if (state.done) {
        return STM.succeedNow(state.value)
      }
      return state.value["stm"].flatMap((val) => {
        const next = iterator.next(val)
        return run(next)
      })
    }

    return run(state)
  })
}

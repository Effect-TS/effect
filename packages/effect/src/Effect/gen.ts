/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import type { _E, _R } from "../Utils"
import { chain_, succeed, suspend } from "./core"
import type { Effect } from "./effect"

export class GenEffect<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly effect: Effect<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenEffect<R, E, A>, A, any> {
    return (yield this) as any
  }
}

export function gen<Eff, REff extends _R<Eff>, EEff extends _E<Eff>, AEff>(
  f: (
    i: <R, E, A>(_: Effect<R, E, A>) => GenEffect<R, E, A>
  ) => Generator<Eff, AEff, any>
): Effect<REff, EEff, AEff> {
  return suspend(() => {
    const iterator = f((_) => new GenEffect(_))
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> {
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

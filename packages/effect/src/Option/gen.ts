import type { Option } from "../Option"
import { chain_, some } from "./core"

export class GenOption<A> {
  readonly _A!: () => A

  constructor(readonly effect: Option<A>) {}

  *[Symbol.iterator](): Generator<GenOption<A>, A, any> {
    return yield this
  }
}

const adapter: <A>(_: Option<A>) => GenOption<A> = (_) => new GenOption(_)

export function gen<Eff extends GenOption<any>, AEff>(
  f: (i: <A>(_: Option<A>) => GenOption<A>) => Generator<Eff, AEff, any>
): Option<AEff> {
  const iterator = f(adapter)
  const state = iterator.next()

  function run(
    state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
  ): Option<AEff> {
    if (state.done) {
      return some(state.value)
    }
    return chain_(state.value["effect"], (val) => {
      const next = iterator.next(val)
      return run(next)
    })
  }

  return run(state)
}

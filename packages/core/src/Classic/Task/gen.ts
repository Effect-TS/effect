import type { Task } from "../Task"
import { chain, sync } from "./core"

export class GenTask<A> {
  readonly _A!: () => A

  constructor(readonly effect: Task<A>) {}

  *[Symbol.iterator](): Generator<GenTask<A>, A, any> {
    return yield this
  }
}

const adapter: <A>(_: Task<A>) => GenTask<A> = (_) => new GenTask(_)

export function gen<Eff extends GenTask<any>, AEff>(
  f: (i: <A>(_: Task<A>) => GenTask<A>) => Generator<Eff, AEff, any>
): Task<AEff> {
  const iterator = f(adapter)
  const state = iterator.next()

  function run(
    state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
  ): Task<AEff> {
    if (state.done) {
      return sync(() => state.value)
    }
    return chain((val) => {
      const next = iterator.next(val)
      return run(next)
    })(state.value["effect"])
  }

  return run(state)
}

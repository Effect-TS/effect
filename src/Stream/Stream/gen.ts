import * as M from "../_internal/managed"
import type { _E, _R } from "../../Utils"
import { chain_ } from "./chain"
import { Stream } from "./definitions"
import { succeed } from "./succeed"

export class GenStream<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
  constructor(readonly effect: Stream<R, E, A>) {}
  *[Symbol.iterator](): Generator<GenStream<R, E, A>, A, any> {
    return yield this
  }
}
const adapter = (_: any) => {
  return new GenStream(_)
}
export function suspend<R, E, A>(f: () => Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(M.suspend(() => f().proc))
}
export function gen<Eff extends GenStream<any, any, any>, AEff>(
  f: (i: {
    <R, E, A>(_: Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<Eff, AEff, any>
): Stream<_R<Eff>, _E<Eff>, AEff> {
  return suspend(() => {
    const iterator = f(adapter as any)
    const state = iterator.next()
    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Stream<any, any, AEff> {
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(state.value["effect"], (val) => {
        // 1 : definisci cosa vuol dire "prima"
        // 2 : come ottengo "iterator.next" di "prima" per passarci il valore "val" nuovo?
        const next = iterator.next(val)
        return run(next)
      })
    }
    return run(state)
  })
}

import * as M from "../_internal/managed"
import { die } from "../../Effect/die"
import { PrematureGeneratorExit } from "../../GlobalExceptions"
import type { _E, _R } from "../../Utils"
import { chain_ } from "./chain"
import { Stream } from "./definitions"
import { fromEffect } from "./fromEffect"
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
    function run(replayStack: any[]): Stream<any, any, AEff> {
      const iterator = f(adapter as any)
      let state = iterator.next()
      for (let i = 0; i < replayStack.length; i++) {
        if (state.done) {
          return fromEffect(die(new PrematureGeneratorExit()))
        }
        state = iterator.next(replayStack[i])
      }
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(state.value["effect"], (val) => {
        return run(replayStack.concat([val]))
      })
    }
    return run([])
  })
}

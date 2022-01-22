// ets_tracing: off

import * as L from "@effect-ts/system/Collections/Immutable/List"
import { PrematureGeneratorExit } from "@effect-ts/system/GlobalExceptions"

import { pipe } from "../../Function/index.js"
import type * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"
import { chainF } from "./chain.js"
import { succeedF } from "./succeed.js"

export class GenHKT<T, A> {
  constructor(readonly effect: T) {}

  *[Symbol.iterator](): Generator<GenHKT<T, A>, A, any> {
    return yield this
  }
}

export class GenLazyHKT<T, A> {
  constructor(readonly effect: () => T) {}

  *[Symbol.iterator](): Generator<GenLazyHKT<T, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any) => {
  return new GenHKT(_)
}

const adapterLazy = (_: () => any) => {
  return new GenHKT(_)
}

/**
 * To be used with multi-shot monads, required adapter to be lazy
 * and is O(n^2) perf wise because the generator needs to be replayed
 */
export function genWithHistoryF<
  F extends HKT.HKT,
  C,
  ADAPTER = {
    <R, E, A>(_: () => HKT.Kind<F, R, E, A>): GenLazyHKT<HKT.Kind<F, R, E, A>, A>
  }
>(F_: Monad<F>, config?: { adapter?: ADAPTER }) {
  return <Eff extends GenLazyHKT<HKT.Kind<F, any, any, any>, any>, AEff>(
    f: (i: ADAPTER) => Generator<Eff, AEff, any>
  ): HKT.Kind<
    F,
    HKT.Infer<F, "R", ReturnType<Eff["effect"]>>,
    HKT.Infer<F, "E", ReturnType<Eff["effect"]>>,
    AEff
  > => {
    const chain = chainF(F_)
    const succeed = succeedF(F_)

    return pipe(
      succeed({}),
      chain(() => {
        function run(
          replayStack: L.List<any>
        ): HKT.Kind<
          F,
          HKT.Infer<F, "R", ReturnType<Eff["effect"]>>,
          HKT.Infer<F, "E", ReturnType<Eff["effect"]>>,
          AEff
        > {
          const iterator = f((config?.adapter ? config.adapter : adapterLazy) as any)
          let state = iterator.next()

          for (const a of replayStack) {
            if (state.done) {
              throw new PrematureGeneratorExit()
            }
            state = iterator.next(a)
          }

          if (state.done) {
            return succeed(state.value)
          }

          return chain((val) => {
            return run(L.append_(replayStack, val))
          })(state.value["effect"]())
        }

        return run(L.empty())
      })
    )
  }
}

/**
 * To be used in one-shot monads, adapter is eager and perf is native
 */
export const genF =
  <
    F extends HKT.HKT,
    C,
    ADAPTER = {
      <X, I, R, E, A>(_: HKT.Kind<F, R, E, A>): GenHKT<HKT.Kind<F, R, E, A>, A>
    }
  >(
    F_: Monad<F>,
    config?: { adapter?: ADAPTER }
  ) =>
  <Eff extends GenHKT<HKT.Kind<F, any, any, any>, any>, AEff>(
    f: (i: ADAPTER) => Generator<Eff, AEff, any>
  ): HKT.Kind<
    F,
    HKT.Infer<F, "R", Eff["effect"]>,
    HKT.Infer<F, "E", Eff["effect"]>,
    AEff
  > => {
    const chain = chainF(F_)
    const succeed = succeedF(F_)

    return pipe(
      succeed({}),
      chain(() => {
        const iterator = f((config?.adapter ? config.adapter : adapter) as any)
        const state = iterator.next()

        function run(
          state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
        ): HKT.Kind<
          F,
          HKT.Infer<F, "R", Eff["effect"]>,
          HKT.Infer<F, "E", Eff["effect"]>,
          AEff
        > {
          if (state.done) {
            return succeed(state.value)
          }
          return chain((val) => {
            const next = iterator.next(val)
            return run(next)
          })(state.value["effect"])
        }

        return run(state)
      })
    )
  }

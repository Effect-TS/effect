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
  F extends HKT.URIS,
  C,
  ADAPTER = {
    <K, Q, W, X, I, S, R, E, A>(
      _: () => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ): GenLazyHKT<HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>, A>
  }
>(
  F: Monad<F>,
  config?: { adapter?: ADAPTER }
): <
  Eff extends GenLazyHKT<
    HKT.Kind<F, C, any, any, any, any, any, any, any, any, any>,
    any
  >,
  AEff
>(
  f: (i: ADAPTER) => Generator<Eff, AEff, any>
) => HKT.Kind<
  F,
  C,
  HKT.Infer<F, C, "K", ReturnType<Eff["effect"]>>,
  HKT.Infer<F, C, "Q", ReturnType<Eff["effect"]>>,
  HKT.Infer<F, C, "W", ReturnType<Eff["effect"]>>,
  HKT.Infer<F, C, "X", ReturnType<Eff["effect"]>>,
  HKT.Infer<F, C, "I", ReturnType<Eff["effect"]>>,
  HKT.Infer<F, C, "S", ReturnType<Eff["effect"]>>,
  HKT.Infer<F, C, "R", ReturnType<Eff["effect"]>>,
  HKT.Infer<F, C, "E", ReturnType<Eff["effect"]>>,
  AEff
>
export function genWithHistoryF<F>(
  F: Monad<HKT.UHKT<F>>,
  config?: {
    adapter?: {
      <A>(_: () => HKT.HKT<F, A>): GenLazyHKT<HKT.HKT<F, A>, A>
    }
  }
): <Eff extends GenLazyHKT<HKT.HKT<F, any>, any>, AEff>(
  f: (i: {
    <A>(_: () => HKT.HKT<F, A>): GenLazyHKT<HKT.HKT<F, A>, A>
  }) => Generator<Eff, AEff, any>
) => HKT.HKT<F, AEff> {
  const chain = chainF(F)
  const succeed = succeedF(F)

  return <Eff extends GenLazyHKT<HKT.HKT<F, any>, any>, AEff>(
    f: (i: {
      <A>(_: () => HKT.HKT<F, A>): GenLazyHKT<HKT.HKT<F, A>, A>
    }) => Generator<Eff, AEff, any>
  ): HKT.HKT<F, AEff> => {
    return pipe(
      succeed({}),
      chain(() => {
        function run(replayStack: L.List<any>): HKT.HKT<F, AEff> {
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
export function genF<
  F extends HKT.URIS,
  C,
  ADAPTER = {
    <K, Q, W, X, I, S, R, E, A>(_: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>): GenHKT<
      HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
      A
    >
  }
>(
  F: Monad<F>,
  config?: { adapter?: ADAPTER }
): <
  Eff extends GenHKT<HKT.Kind<F, C, any, any, any, any, any, any, any, any, any>, any>,
  AEff
>(
  f: (i: ADAPTER) => Generator<Eff, AEff, any>
) => HKT.Kind<
  F,
  C,
  HKT.Infer<F, C, "K", Eff["effect"]>,
  HKT.Infer<F, C, "Q", Eff["effect"]>,
  HKT.Infer<F, C, "W", Eff["effect"]>,
  HKT.Infer<F, C, "X", Eff["effect"]>,
  HKT.Infer<F, C, "I", Eff["effect"]>,
  HKT.Infer<F, C, "S", Eff["effect"]>,
  HKT.Infer<F, C, "R", Eff["effect"]>,
  HKT.Infer<F, C, "E", Eff["effect"]>,
  AEff
>
export function genF<F>(
  F: Monad<HKT.UHKT<F>>,
  config?: {
    adapter?: {
      <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A>
    }
  }
): <Eff extends GenHKT<HKT.HKT<F, any>, any>, AEff>(
  f: (i: {
    <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A>
  }) => Generator<Eff, AEff, any>
) => HKT.HKT<F, AEff> {
  const chain = chainF(F)
  const succeed = succeedF(F)

  return <Eff extends GenHKT<HKT.HKT<F, any>, any>, AEff>(
    f: (i: {
      <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A>
    }) => Generator<Eff, AEff, any>
  ): HKT.HKT<F, AEff> => {
    return pipe(
      succeed({}),
      chain(() => {
        const iterator = f((config?.adapter ? config.adapter : adapter) as any)
        const state = iterator.next()

        function run(
          state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
        ): HKT.HKT<F, AEff> {
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
}

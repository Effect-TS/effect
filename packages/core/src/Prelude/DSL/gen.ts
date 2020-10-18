import { PrematureGeneratorExit } from "@effect-ts/system/GlobalExceptions"

import { pipe } from "../../Function"
import type * as HKT from "../HKT"
import type { Monad } from "../Monad"
import { chainF, succeedF } from "./dsl"

export class GenHKT<T, A> {
  constructor(readonly effect: T) {}

  *[Symbol.iterator](): Generator<GenHKT<T, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any) => {
  return new GenHKT(_)
}

export function genF<
  F extends HKT.URIS,
  C,
  ADAPTER = {
    <N extends string, K, Q, W, X, I, S, R, E, A>(
      _: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
    ): GenHKT<HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>, A>
  }
>(
  F: Monad<F>,
  config?: { adapter?: ADAPTER; optimizedOrFull?: "optimized" | "full" }
): <
  Eff extends GenHKT<
    HKT.Kind<F, C, any, any, any, any, any, any, any, any, any, any>,
    any
  >,
  AEff
>(
  f: (i: ADAPTER) => Generator<Eff, AEff, any>
) => HKT.Kind<
  F,
  C,
  HKT.Infer<F, "N", Eff["effect"]>,
  HKT.Infer<F, "K", Eff["effect"]>,
  HKT.Infer<F, "Q", Eff["effect"]>,
  HKT.Infer<F, "W", Eff["effect"]>,
  HKT.Infer<F, "X", Eff["effect"]>,
  HKT.Infer<F, "I", Eff["effect"]>,
  HKT.Infer<F, "S", Eff["effect"]>,
  HKT.Infer<F, "R", Eff["effect"]>,
  HKT.Infer<F, "E", Eff["effect"]>,
  AEff
>
export function genF<F>(
  F: Monad<HKT.UHKT<F>>,
  config?: {
    adapter?: {
      <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A>
    }
    stack?: "discard" | "keep-all"
  }
): <Eff extends GenHKT<HKT.HKT<F, any>, any>, AEff>(
  f: (i: {
    <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A>
  }) => Generator<Eff, AEff, any>
) => HKT.HKT<F, AEff> {
  const chain = chainF(F)
  const succeed = succeedF(F)

  if (config?.stack === "keep-all") {
    return <Eff extends GenHKT<HKT.HKT<F, any>, any>, AEff>(
      f: (i: {
        <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A>
      }) => Generator<Eff, AEff, any>
    ): HKT.HKT<F, AEff> => {
      return pipe(
        succeed({}),
        chain(() => {
          function run(replayStack: any[]): HKT.HKT<F, AEff> {
            const iterator = f((config?.adapter ? config.adapter : adapter) as any)
            let state = iterator.next()
            for (let i = 0; i < replayStack.length; i++) {
              if (state.done) {
                throw new PrematureGeneratorExit()
              }
              state = iterator.next(replayStack[i])
            }
            if (state.done) {
              return succeed(state.value)
            }
            return chain((val) => {
              return run(replayStack.concat([val]))
            })(state.value["effect"])
          }
          return run([])
        })
      )
    }
  }

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

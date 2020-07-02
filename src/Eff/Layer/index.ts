import { provideSome_ } from "../Effect"
import { Effect } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { Has, provideService } from "../Has"
import { chain_ as managedChain_ } from "../Managed/chain_"
import { fromEffect } from "../Managed/fromEffect"
import { makeExit_ } from "../Managed/makeExit_"
import { Managed } from "../Managed/managed"
import { map_ } from "../Managed/map_"
import { use_ } from "../Managed/use_"
import { zipWithPar_ as managedZipWithPar_ } from "../Managed/zipWithPar_"

export class Layer<S, R, E, A> {
  readonly _A!: A

  constructor(
    readonly build: Managed<
      S,
      R,
      E,
      (_: Effect<any, any, any, any>) => Effect<any, any, any, any>
    >
  ) {}

  use<S1, R1, E1, A1>(
    effect: Effect<S1, R1 & A, E1, A1>
  ): Effect<S | S1, R & R1, E | E1, A1> {
    return use_(this.build, (p) => p(effect))
  }
}

export const managedService = <K, A>(has: Has<K, A>) => <S, R, E, B extends A>(
  acquire: Effect<S, R, E, B>
) => <S2, R2, E2>(release: (a: B) => Effect<S2, R2, E2, any>) =>
  new Layer<S | S2, R & R2, E | E2, Has<K, A>>(
    map_(
      makeExit_(acquire, (a) => release(a)),
      (a) => (e) => provideService(has)(a)(e)
    )
  )

export const managedEnv = <S, R, E, A>(
  acquire: Effect<S, R, E, A>,
  overridable: "overridable" | "final" = "final"
) => <S2, R2, E2>(release: (a: A) => Effect<S2, R2, E2, any>) =>
  new Layer<S | S2, R & R2, E | E2, A>(
    map_(
      makeExit_(acquire, (a) => release(a)),
      (a) => (e) =>
        provideSome_(e, (r) =>
          overridable === "final" ? { ...r, ...a } : { ...a, ...r }
        )
    )
  )

export const zip_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<S | S2, R & R2, E | E2, A & A2>(
    managedChain_(left.build, (l) =>
      managedChain_(right.build, (r) =>
        fromEffect(effectTotal(() => (effect) => l(r(effect))))
      )
    )
  )

export const using = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R & A2, E, A>
) => using_<S, R, E, A, S2, R2, E2, A2>(left, right)

export const using_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R & A2, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<S | S2, R & R2, E | E2, A & A2>(
    managedChain_(right.build, (r) =>
      fromEffect(effectTotal(() => (effect) => r(left.use(effect))))
    )
  )

export const zipPar = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R, E, A>
) => zipPar_(left, right)

export const zipPar_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<unknown, R & R2, E | E2, A & A2>(
    managedChain_(
      managedZipWithPar_(left.build, right.build, (a, b) => [a, b] as const),
      ([l, r]) => fromEffect(effectTotal(() => (effect) => l(r(effect))))
    )
  )

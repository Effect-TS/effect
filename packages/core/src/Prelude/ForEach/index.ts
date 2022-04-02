// ets_tracing: off

import { identity, pipe } from "../../Function/index.js"
import type { Covariant, CovariantComposition } from "../Covariant/index.js"
import { getCovariantComposition } from "../Covariant/index.js"
import * as HKT from "../HKT/index.js"
import type { IdentityBoth } from "../IdentityBoth/index.js"

export interface ForeachFn<F extends HKT.HKT> {
  <G extends HKT.HKT>(G: IdentityBoth<G> & Covariant<G>): <GR, GE, A, B>(
    f: (a: A) => HKT.Kind<G, GR, GE, B>
  ) => <FR, FE>(
    fa: HKT.Kind<F, FR, FE, A>
  ) => HKT.Kind<G, GR, GE, HKT.Kind<F, FR, FE, B>>
}

export interface ForeachFn_<F extends HKT.HKT> {
  <G extends HKT.HKT, FR, FE, A>(
    fa: HKT.Kind<F, FR, FE, A>,
    G: IdentityBoth<G> & Covariant<G>
  ): <GK, GQ, GW, GS, GR, GE, B>(
    f: (a: A) => HKT.Kind<G, GR, GE, B>
  ) => HKT.Kind<G, GR, GE, HKT.Kind<F, FR, FE, B>>
}

export interface ForEach<F extends HKT.HKT> extends Covariant<F> {
  readonly forEachF: ForeachFn<F>
}

export function implementForEachF<F extends HKT.HKT>(): (
  i: <N extends string, R, E, A, B, G extends HKT.HKT>(_: {
    A: A
    B: B
    G: G
    N: N
    R: R
    E: E
  }) => (
    G: IdentityBoth<G> & Covariant<G>
  ) => (
    f: (a: A) => HKT.Kind<G, R, E, B>
  ) => (fa: HKT.Kind<F, R, E, A>) => HKT.Kind<G, R, E, HKT.Kind<F, R, E, B>>
) => ForeachFn<F>
export function implementForEachF() {
  return (i: any) => i()
}

export interface ForEachCompositionFn<F extends HKT.HKT, G extends HKT.HKT> {
  <H extends HKT.HKT>(H: IdentityBoth<H> & Covariant<H>): <HR, HE, A, B>(
    f: (a: A) => HKT.Kind<H, HR, HE, B>
  ) => <FR, FE, GR, GE>(
    fa: HKT.Kind<F, FR, FE, HKT.Kind<G, GR, GE, A>>
  ) => HKT.Kind<H, HR, HE, HKT.Kind<F, FR, FE, HKT.Kind<G, GR, GE, B>>>
}

export interface ForEachComposition<F extends HKT.HKT, G extends HKT.HKT>
  extends CovariantComposition<F, G> {
  readonly forEachF: ForEachCompositionFn<F, G>
}

export function getForEachComposition<F extends HKT.HKT, G extends HKT.HKT>(
  F_: ForEach<F>,
  G_: ForEach<G>
): ForEachComposition<F, G> {
  return HKT.instance<ForEachComposition<F, G>>({
    ...getCovariantComposition(F_, G_),
    forEachF: (H) => (f) => (fa) => pipe(fa, F_.forEachF(H)(G_.forEachF(H)(f)))
  })
}

export function sequenceF<T extends HKT.HKT, C>(
  T_: ForEach<T>
): <F extends HKT.HKT>(
  App: Covariant<F> & IdentityBoth<F>
) => <R, E, FR, FE, A>(
  _: HKT.Kind<T, R, E, HKT.Kind<F, FR, FE, A>>
) => HKT.Kind<F, FR, FE, HKT.Kind<T, R, E, A>> {
  return (App) => {
    const traverse = T_.forEachF(App)
    return traverse(identity)
  }
}

// ets_tracing: off

import type { Covariant } from "../Covariant/index.js"
import type * as HKT from "../HKT/index.js"
import type { IdentityBoth } from "../IdentityBoth/index.js"

export interface ForEachWithIndexFn<K, F extends HKT.HKT> {
  <G extends HKT.HKT>(G_: IdentityBoth<G> & Covariant<G>): <GR, GE, A, B>(
    f: (k: K, a: A) => HKT.Kind<G, GR, GE, B>
  ) => <FR, FE>(
    fa: HKT.Kind<F, FR, FE, A>
  ) => HKT.Kind<G, GR, GE, HKT.Kind<F, FR, FE, B>>
}

export interface ForEachWithIndex<K, F extends HKT.HKT> extends Covariant<F> {
  readonly forEachWithIndexF: ForEachWithIndexFn<K, F>
}

export function implementForEachWithIndexF<K, F extends HKT.HKT>(): (
  i: <R, E, A, B, G extends HKT.HKT>(_: {
    A: A
    B: B
    G: G
    R: R
    E: E
  }) => (
    G: IdentityBoth<G> & Covariant<G>
  ) => (
    f: (k: K, a: A) => HKT.Kind<G, R, E, B>
  ) => (fa: HKT.Kind<F, R, E, A>) => HKT.Kind<G, R, E, HKT.Kind<F, R, E, B>>
) => ForEachWithIndexFn<K, F>
export function implementForEachWithIndexF() {
  return (i: any) => i()
}

// ets_tracing: off

import type { Covariant } from "../Covariant/index.js"
import type * as HKT from "../HKT/index.js"
import type { IdentityBoth } from "../IdentityBoth/index.js"

export interface ForEachWithIndexFn<K, F extends HKT.HKT> {
  <G extends HKT.HKT>(G_: IdentityBoth<G> & Covariant<G>): <GX, GI, GR, GE, A, B>(
    f: (k: K, a: A) => HKT.Kind<G, GX, GI, GR, GE, B>
  ) => <FX, FI, FR, FE>(
    fa: HKT.Kind<F, FX, FI, FR, FE, A>
  ) => HKT.Kind<G, GX, GI, GR, GE, HKT.Kind<F, FX, FI, FR, FE, B>>
}

export interface ForEachWithIndex<K, F extends HKT.HKT> extends Covariant<F> {
  readonly forEachWithIndexF: ForEachWithIndexFn<K, F>
}

// @todo: Warn noteable change, all implementX are gone

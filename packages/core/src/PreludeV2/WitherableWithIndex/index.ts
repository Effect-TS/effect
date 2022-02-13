// ets_tracing: off

import type { Option } from "@effect-ts/system/Option"

import type { Applicative } from "../Applicative"
import type * as HKT from "../HKT"

export interface WitherWithIndex<K, F extends HKT.HKT> {
  <G extends HKT.HKT>(F: Applicative<G>): <GX, GI, GR, GE, A, B>(
    f: (k: K, a: A) => HKT.Kind<G, GX, GI, GR, GE, Option<B>>
  ) => <FX, FI, FR, FE>(
    ta: HKT.Kind<F, FX, FI, FR, FE, A>
  ) => HKT.Kind<G, GX, GI, GR, GE, HKT.Kind<F, FX, FI, FR, FE, B>>
}

export interface WitherableWithIndex<K, F extends HKT.HKT> {
  readonly compactWithIndexF: WitherWithIndex<K, F>
}

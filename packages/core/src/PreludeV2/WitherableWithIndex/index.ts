// ets_tracing: off

import type { Option } from "@effect-ts/system/Option"

import type { Applicative } from "../Applicative/index.js"
import type * as HKT from "../HKT/index.js"

export interface WitherWithIndex<K, F extends HKT.HKT> extends HKT.Typeclass<F> {
  <G extends HKT.HKT>(F: Applicative<G>): <GR, GE, A, B>(
    f: (k: K, a: A) => HKT.Kind<G, GR, GE, Option<B>>
  ) => <FR, FE>(
    ta: HKT.Kind<F, FR, FE, A>
  ) => HKT.Kind<G, GR, GE, HKT.Kind<F, FR, FE, B>>
}

export interface WitherableWithIndex<K, F extends HKT.HKT> {
  readonly compactWithIndexF: WitherWithIndex<K, F>
}

export function implementCompactWithIndexF<K, F extends HKT.HKT>(): (
  i: <FR, FE, A, B, G>(_: {
    A: A
    B: B
    G: G
    FR: FR
    FE: FE
  }) => (
    G: Applicative<G>
  ) => (
    f: (k: K, a: A) => HKT.Kind<G, FR, FE, Option<B>>
  ) => (ta: HKT.Kind<F, FR, FE, A>) => HKT.Kind<G, FR, FE, HKT.Kind<F, FR, FE, B>>
) => WitherWithIndex<K, F>
export function implementCompactWithIndexF() {
  return (i: any) => i()
}

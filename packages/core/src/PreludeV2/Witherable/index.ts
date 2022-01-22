// ets_tracing: off

import type { Option } from "@effect-ts/system/Option"

import type { Applicative } from "../Applicative/index.js"
import type * as HKT from "../HKT/index.js"

export interface Wither<F extends HKT.HKT> extends HKT.Typeclass<F> {
  <G extends HKT.HKT>(F: Applicative<G>): <GR, GE, A, B>(
    f: (a: A) => HKT.Kind<G, GR, GE, Option<B>>
  ) => <FR, FE>(
    ta: HKT.Kind<F, FR, FE, A>
  ) => HKT.Kind<G, GR, GE, HKT.Kind<F, FR, FE, B>>
}

export interface Witherable<F extends HKT.HKT> {
  readonly compactF: Wither<F>
}

export function implementCompactF<F extends HKT.HKT>(): (
  i: <FR, FE, A, B, G extends HKT.HKT>(_: {
    A: A
    B: B
    G: G
    FR: FR
    FE: FE
  }) => (
    G: Applicative<G>
  ) => (
    f: (a: A) => HKT.Kind<G, FR, FE, Option<B>>
  ) => (ta: HKT.Kind<F, FR, FE, A>) => HKT.Kind<G, FR, FE, HKT.Kind<F, FR, FE, B>>
) => Wither<F>
export function implementCompactF() {
  return (i: any) => i()
}

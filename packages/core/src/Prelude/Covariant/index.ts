import * as HKT from "../HKT"

export interface Covariant<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, B>
}

export interface CovariantComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <
    FN extends string,
    FK,
    FSI,
    FSO,
    FX,
    FI,
    FS,
    FR,
    FE,
    GN extends string,
    GK,
    GSI,
    GSO,
    GX,
    GI,
    GS,
    GR,
    GE
  >(
    fa: HKT.Kind<
      F,
      CF,
      FN,
      FK,
      FSI,
      FSO,
      FX,
      FI,
      FS,
      FR,
      FE,
      HKT.Kind<G, CG, GN, GK, GSI, GSO, GX, GI, GS, GR, GE, A>
    >
  ) => HKT.Kind<
    F,
    CF,
    FN,
    FK,
    FSI,
    FSO,
    FX,
    FI,
    FS,
    FR,
    FE,
    HKT.Kind<G, CG, GN, GK, GSI, GSO, GX, GI, GS, GR, GE, B>
  >
}

export function getCovariantComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
>(F: Covariant<F, CF>, G: Covariant<G, CG>): CovariantComposition<F, G, CF, CG>
export function getCovariantComposition(
  F: Covariant<[HKT.UF_]>,
  G: Covariant<[HKT.UG_]>
) {
  return HKT.instance<CovariantComposition<[HKT.UF_], [HKT.UG_]>>({
    map: (f) => F.map(G.map(f))
  })
}

import { Effect } from "@matechs/preview/Effect"
import { HasURI, HKTFull, KindFull, URIS } from "@matechs/preview/_abstract/HKT"

export interface FromEffectF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fromEffect: <R, E, A>(
    fa: Effect<unknown, R, E, A>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, R, E, A>
}

export interface FromEffectK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fromEffect: <R, E, A>(
    fa: Effect<unknown, R, E, A>
  ) => KindFull<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, R, E, A>
}

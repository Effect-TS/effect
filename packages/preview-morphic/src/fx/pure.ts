import { XPure } from "@matechs/preview/XPure"
import { HasURI, HKTFull, KindFull, URIS } from "@matechs/preview/_abstract/HKT"

export interface FromXPureF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fromXPure: <R, E, A>(
    fa: XPure<unknown, unknown, R, E, A>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, R, E, A>
}

export interface FromXPureK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fromXPure: <R, E, A>(
    fa: XPure<unknown, unknown, R, E, A>
  ) => KindFull<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, R, E, A>
}

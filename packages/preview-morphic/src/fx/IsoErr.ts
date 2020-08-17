import { ErrFor } from "@matechs/preview/_abstract/HKT"

export interface IsoErr<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  wrapErr: <E>(e: E) => ErrFor<F, TL0, TL1, TL2, TL3, E>
  unwrapErr: <E>(e: ErrFor<F, TL0, TL1, TL2, TL3, E>) => E
}

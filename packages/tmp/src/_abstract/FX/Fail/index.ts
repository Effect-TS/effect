import { ErrFor, HasURI, HKTFull, KindFull, URIS } from "../../HKT"

export interface FailF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fail: <E, S, SI>(
    e: ErrFor<F, TL0, TL1, TL2, TL3, E>
  ) => HKTFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    never,
    never,
    SI,
    never,
    never,
    unknown,
    S,
    unknown,
    E,
    never
  >
}

export interface FailK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fail: <E, S, SI>(
    e: ErrFor<F, TL0, TL1, TL2, TL3, E>
  ) => KindFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    never,
    never,
    SI,
    never,
    never,
    unknown,
    S,
    unknown,
    E,
    never
  >
}

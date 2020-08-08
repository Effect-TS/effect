import { HKT, Kind, URIS } from "../HKT"

export interface DeriveF<F, Typeclass> {
  readonly Derive: "Derive"
  readonly derive: <A>(fa: HKT<Typeclass, A>) => HKT<Typeclass, HKT<F, A>>
}

export interface DeriveK<F extends URIS, Typeclass extends URIS> {
  readonly Derive: "Derive"
  readonly derive: <X, I, S, R, E, A>(
    fa: Kind<Typeclass, X, I, S, R, E, A>
  ) => Kind<Typeclass, X, I, S, R, E, Kind<F, X, I, S, R, E, A>>
}

export function makeDerive<F extends URIS, Typeclass extends URIS>(
  _: F,
  __: Typeclass
): (_: Omit<DeriveK<F, Typeclass>, "Derive">) => DeriveK<F, Typeclass>
export function makeDerive<F, Typeclass>(
  _: F,
  __: Typeclass
): (_: Omit<DeriveF<F, Typeclass>, "Derive">) => DeriveF<F, Typeclass> {
  return (_) => ({
    Derive: "Derive",
    ..._
  })
}
